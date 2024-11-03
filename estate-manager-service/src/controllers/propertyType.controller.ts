import { NextFunction, Request, Response } from 'express';
import elasticClient from '../configs/elastic.config';
import RabbitMQ from '../configs/rabbitmq.config';
import Redis from '../configs/redis.config';
import { PROPERTY_QUEUE } from '../constants/rabbitmq';
import redis from '../constants/redis';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { propertyTypeSchema } from '../schemas/propertyType.schema';
import { findPropertiesByTypeIdService, updatePropertyTypeInPropertiesService } from '../services/property.service';
import {
    createPropertyTypeService,
    getPropertyTypeDetailsService,
    getPropertyTypesService,
    softDeletePropertyTypeService,
    updatePropertyTypeService,
} from '../services/propertyType.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

const REDIS_KEY = redis.PROPERTY;

export const createPropertyType = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = propertyTypeSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const propertyType = await createPropertyTypeService(safeParse.data);

        res.status(201).json(propertyType);
    } catch (error) {
        next(error);
    }
};

export const getPropertyTypes = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const propertyTypes = await getPropertyTypesService();

        res.status(200).json(propertyTypes);
    } catch (error) {
        next(error);
    }
};

export const getPropertyTypeDetails = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await getPropertyTypeDetailsService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const updatePropertyType = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const propertyId = req.params.id;

        const safeParse = propertyTypeSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const propertyType = await updatePropertyTypeService(propertyId, safeParse.data);

        updatePropertyTypeInPropertiesService(propertyId, propertyType.name)
            .then(() => findPropertiesByTypeIdService(propertyId))
            .then((properties) => {
                Redis.getInstance().getClient().del(REDIS_KEY.ALL_PROPERTIES);

                properties.forEach((property) => {
                    Redis.getInstance().getClient().del(`${REDIS_KEY.PROPERTY}${property.slug}`);

                    elasticClient
                        .updateByQuery({
                            index: 'properties',
                            body: {
                                script: {
                                    source: `
                                        ctx._source.type.name = params.typeName;
                                        ctx._source.updatedAt = params.updatedAt;
                                    `,
                                    params: {
                                        typeName: property.type.name,
                                        updatedAt: new Date().toISOString(),
                                    },
                                },
                                query: {
                                    term: {
                                        _id: property.propertyId,
                                    },
                                },
                            },
                        })
                        .then(console.log, console.error)
                        .catch(console.error);

                    RabbitMQ.getInstance().publishInQueue({
                        exchange: PROPERTY_QUEUE.exchange,
                        name: PROPERTY_QUEUE.name,
                        message: {
                            type: PROPERTY_QUEUE.type.UPDATED,
                            data: property,
                        },
                    });
                });
            });

        res.status(200).json(propertyType);
    } catch (error) {
        next(error);
    }
};

export const softDeletePropertyType = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const propertyId = req.params.id;

        const propertyType = await softDeletePropertyTypeService(propertyId);

        res.status(200).json(propertyType);
    } catch (error) {
        next(error);
    }
};
