import AppError from '../utils/appError.js';
import UniversityProgram from '../models/universityProgramModel.js';

export const ensureManagedUniversityMatch = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return next();

      if (user.role !== 'university_manager') return next();

      const managed = user.managedUniversity;
      const target = req.params?.[paramName];

      if (!managed) {
        return next(
          new AppError('No managed university assigned to this account.', 403),
        );
      }

      const managedId = managed._id ? String(managed._id) : String(managed);
      if (!target || managedId !== String(target)) {
        return next(
          new AppError(
            'You do not have permission to modify this university.',
            403,
          ),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default ensureManagedUniversityMatch;

export const ensureManagedUniversityMatchesBody = (
  bodyField = 'university',
) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return next();

      if (user.role !== 'university_manager') return next();

      const managed = user.managedUniversity;
      if (!managed)
        return next(
          new AppError('No managed university assigned to this account.', 403),
        );

      const bodyVal = req.body?.[bodyField];
      if (
        !bodyVal ||
        String(bodyVal) !== String(managed._id ? managed._id : managed)
      ) {
        return next(
          new AppError(
            'You do not have permission to create or modify resources for this university.',
            403,
          ),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

export const ensureManagedProgramMatch = (paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return next();

      if (user.role !== 'university_manager') return next();

      const managed = user.managedUniversity;
      if (!managed)
        return next(
          new AppError('No managed university assigned to this account.', 403),
        );

      const programId = req.params?.[paramName];
      if (!programId)
        return next(new AppError('Program id missing from request.', 400));

      const program =
        await UniversityProgram.findById(programId).select('university');
      if (!program)
        return next(new AppError('No program found with that ID.', 404));

      const programUniversityId = String(program.university);
      const managedId = managed._id ? String(managed._id) : String(managed);

      if (programUniversityId !== managedId) {
        return next(
          new AppError(
            'You do not have permission to modify this program.',
            403,
          ),
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
