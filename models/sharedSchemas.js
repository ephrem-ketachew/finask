import mongoose from 'mongoose';
import {
  createGenericUrlField,
  createRequiredString,
  emailField,
  flexiblePhoneField,
  optionalStringField,
} from '../utils/schemaHelpers.js';

export const addressSchema = new mongoose.Schema(
  {
    poBox: optionalStringField,
    street: optionalStringField,
    city: createRequiredString('City'),
  },
  {
    _id: false,

    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

addressSchema.virtual('fullAddress').get(function () {
  const parts = [];
  if (this.street) parts.push(this.street);
  if (this.city) parts.push(this.city);
  if (this.poBox) parts.push(`P.O. Box ${this.poBox}`);

  return parts.join(', ');
});

export const createContactsSchema = (options = {}) => {
  const { isWebsiteRequired = false } = options;

  return new mongoose.Schema(
    {
      emails: { type: [emailField], default: [] },
      phoneNumbers: { type: [flexiblePhoneField], default: [] },
      faxes: { type: [flexiblePhoneField], default: [] },
      websiteUrl: createGenericUrlField({ required: isWebsiteRequired }),
    },
    { _id: false }
  );
};
