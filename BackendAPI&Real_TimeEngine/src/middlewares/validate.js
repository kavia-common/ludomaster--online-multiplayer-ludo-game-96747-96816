import Joi from 'joi';
import { ApiError } from '../utils/error.js';
import { StatusCodes } from 'http-status-codes';

/**
 * Validate request payload against a Joi schema.
 * @param {'body'|'query'|'params'} property
 * @param {Joi.ObjectSchema} schema
 */
export function validate (property, schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { stripUnknown: true, abortEarly: false });
    if (error) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Validation failed', error.details.map(d => d.message)));
    }
    req[property] = value;
    next();
  };
}
