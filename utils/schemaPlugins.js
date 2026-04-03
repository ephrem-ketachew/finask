import { v2 as cloudinary } from 'cloudinary';
import { getPublicIdFromUrl } from './cloudinaryHelper.js';
import slugify from 'slugify';
import mongoose from 'mongoose';

export function cloudinaryImageCleanup(schema) {
  schema.pre('findOneAndDelete', async function (next) {
    try {
      const doc = await this.model.findOne(this.getFilter());
      if (!doc) return next();

      const publicIdsToDelete = [];

      if (doc.coverImage) {
        const publicId = getPublicIdFromUrl(doc.coverImage);
        if (publicId) publicIdsToDelete.push(publicId);
      }

      if (doc.images && Array.isArray(doc.images)) {
        doc.images.forEach((url) => {
          const publicId = getPublicIdFromUrl(url);
          if (publicId) publicIdsToDelete.push(publicId);
        });
      }

      if (publicIdsToDelete.length > 0) {
        await cloudinary.api.delete_resources(publicIdsToDelete);
      }

      next();
    } catch (error) {
      next(error);
    }
  });
}

export function slugGenerator(schema) {
  schema.pre('save', function (next) {
    if (this.isModified('name')) {
      this.slug = slugify(this.name, { lower: true });
    }
    next();
  });
}

/**
 * A robust Mongoose plugin for cascading deletes.
 *
 * @param {mongoose.Schema} schema - The Mongoose schema to attach the plugin to.
 * @param {object} options - Configuration options.
 * @param {Array<object>} options.children - An array of child model configurations.
 */
export function cascadeDelete(schema, options) {
  const children = options.children;

  // --- HOOK FOR SINGLE DOCUMENT DELETION ---
  schema.pre('findOneAndDelete', async function (next) {
    const docToDelete = await this.model
      .findOne(this.getFilter())
      .select('_id');
    if (!docToDelete) return next();

    // Store the document and model name for the post-hook
    this._docToDelete = docToDelete;
    this._modelName = this.model.modelName;
    next();
  });

  schema.post('findOneAndDelete', async function () {
    if (!this._docToDelete) return;
    await executeCascade(this._docToDelete, this._modelName, children);
  });

  // --- HOOK FOR BULK DOCUMENT DELETION ---
  schema.pre('deleteMany', async function (next) {
    // Find all documents that are about to be deleted in a single query
    const docsToDelete = await this.model.find(this.getFilter()).select('_id');
    if (!docsToDelete || docsToDelete.length === 0) return next();

    // Store the documents and model name for the post-hook
    this._docsToDelete = docsToDelete;
    this._modelName = this.model.modelName;
    next();
  });

  schema.post('deleteMany', async function () {
    if (!this._docsToDelete) return;
    // Execute cascade for each deleted document
    const cascadePromises = this._docsToDelete.map((doc) =>
      executeCascade(doc, this._modelName, children)
    );
    await Promise.all(cascadePromises);
  });
}

/**
 * Executes the actual deletion and cleanup logic for a single parent document.
 * @param {mongoose.Document} parentDoc - The parent document being deleted.
 * @param {string} parentModelName - The name of the parent model.
 * @param {Array<object>} childrenConfig - The configuration for child models.
 */
async function executeCascade(parentDoc, parentModelName, childrenConfig) {
  const deletePromises = childrenConfig.map((config) => {
    const ChildModel = mongoose.model(config.model);
    let query;

    if (config.polymorphic) {
      query = { onModelId: parentDoc._id, onModelType: parentModelName };
    } else if (config.foreignKey) {
      query = { [config.foreignKey]: parentDoc._id };
    } else {
      // Default assumption if no foreignKey is provided
      const defaultForeignKey = parentModelName.toLowerCase();
      query = { [defaultForeignKey]: parentDoc._id };
    }

    return ChildModel.deleteMany(query);
  });

  await Promise.all(deletePromises);

  // --- TRIGGER POST-DELETION CLEANUP ---
  // After children are deleted, trigger any necessary recalculations (e.g., ratings)
  if (parentDoc && typeof parentDoc.postDeleteCleanup === 'function') {
    await parentDoc.postDeleteCleanup();
  }
}

/**
 * @description A Mongoose plugin to handle recalculations on a parent model
 * after a bulk delete operation (deleteMany) on its children.
 * @param {mongoose.Schema} schema The Mongoose schema to attach the plugin to.
 * @param {object} options Configuration options.
 * @param {string} options.staticMethodName The name of the static method on the model
 * that should be called to perform the update (e.g., 'calcAverageRatings').
 */
export function updateParentOnDelete(schema, options) {
  const { staticMethodName } = options;

  // Before the bulk delete, find all documents that will be affected.
  schema.pre('deleteMany', async function (next) {
    // Defensive check to ensure the static method exists.
    if (typeof this.model[staticMethodName] !== 'function') {
      return next(
        new Error(
          `Model is missing the required static method: '${staticMethodName}'`
        )
      );
    }

    const docsToDelete = await this.model.find(this.getFilter());

    // Find the unique parent items that need their stats recalculated.
    const parentsToUpdate = [
      ...new Map(
        docsToDelete.map((doc) => [
          `${doc.onModelId}-${doc.onModelType}`,
          { parentId: doc.onModelId, parentModelName: doc.onModelType },
        ])
      ).values(),
    ];

    // Store this information on the query to access it in the post-hook.
    this._parentsToUpdate = parentsToUpdate;
    next();
  });

  // After the bulk delete, trigger the recalculation for each affected parent.
  schema.post('deleteMany', async function () {
    if (this._parentsToUpdate && this._parentsToUpdate.length > 0) {
      const updatePromises = this._parentsToUpdate.map((parent) =>
        this.model[staticMethodName](parent.parentId, parent.parentModelName)
      );
      await Promise.all(updatePromises);
    }
  });
}
