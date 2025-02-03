import Joi from 'joi';
import { TimeOffQueryParams } from '../types/request.types';

export const timeOffQuerySchema = Joi.object<TimeOffQueryParams>({
    s: Joi.string().optional().allow(''),
    limit: Joi.number().integer().min(1).max(100).default(10),
    page: Joi.number().integer().min(1),
    offset: Joi.number().integer().min(0),
    sort: Joi.alternatives().try(
        Joi.array().items(Joi.string().pattern(/^[a-zA-Z]+,(ASC|DESC)$/)),
        Joi.string().pattern(/^[a-zA-Z]+,(ASC|DESC)$/)
    )
}).or('page', 'offset');  // Changed from xor() to or()