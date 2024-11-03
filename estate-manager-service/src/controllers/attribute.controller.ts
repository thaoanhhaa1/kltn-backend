import { NextFunction, Request, Response } from 'express';
import elasticClient from '../configs/elastic.config';
import RabbitMQ from '../configs/rabbitmq.config';
import Redis from '../configs/redis.config';
import { PROPERTY_QUEUE } from '../constants/rabbitmq';
import redis from '../constants/redis';
import { attributeSchema } from '../schemas/attribute.schema';
import {
    createAttributeService,
    deleteAttributeService,
    getAllAttributesCbbService,
    getAllAttributesService,
    getAttributeByIdService,
    updateAttributeService,
} from '../services/attribute.service';
import { getPropertyDetailsByIdsService } from '../services/property.service';
import { getPropertyIdByAttributeIdService } from '../services/propertyAttribute.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

const REDIS_KEY = redis.PROPERTY;

export const createAttribute = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = attributeSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const attribute = await createAttributeService(safeParse.data);
        res.status(201).json(attribute);
    } catch (error) {
        next(error);
    }
};

export const getAllAttributes = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const attributes = await getAllAttributesService();
        res.json(attributes);
    } catch (error) {
        next(error);
    }
};

export const getAllAttributesCbb = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const attributes = await getAllAttributesCbbService();
        res.json(attributes);
    } catch (error) {
        next(error);
    }
};

export const getAttributeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const attribute = await getAttributeByIdService(req.params.id);
        if (attribute) {
            res.json(attribute);
        } else {
            res.status(404).json({ error: 'Không tìm thấy tiện ích' });
        }
    } catch (error) {
        next(error);
    }
};

export const updateAttribute = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = attributeSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const attribute = await updateAttributeService(req.params.id, req.body);
        if (attribute) {
            getPropertyIdByAttributeIdService(attribute.id)
                .then((data) => {
                    const propertyIds = data.map((item: any) => item.propertyId);

                    return getPropertyDetailsByIdsService(propertyIds);
                })
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
                                            ctx._source.attributes = params.attributes;
                                            ctx._source.updatedAt = params.updatedAt;
                                        `,
                                        params: {
                                            attributes: property.attributes,
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

            res.json(attribute);
        } else {
            res.status(404).json({ error: 'Không tìm thấy tiện ích' });
        }
    } catch (error) {
        next(error);
    }
};

export const deleteAttribute = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await deleteAttributeService(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
