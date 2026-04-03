import Interaction from '../models/interactionModel.js';

/**
 * Logs a user interaction without blocking the main request-response cycle.
 * @param {object} data - The interaction data.
 * @param {string} data.universityId - The ID of the university.
 * @param {string} data.eventType - The type of interaction.
 * @param {string} [data.userId] - The ID of the user (optional).
 */
export const logInteraction = (data) => {
  Interaction.create({
    university: data.universityId,
    user: data.userId,
    eventType: data.eventType,
  }).catch((err) => {
    console.error('Failed to log interaction:', err);
  });
};
