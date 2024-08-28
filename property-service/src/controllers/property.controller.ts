import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { PropertyStatus } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import elasticClient from '../configs/elastic.config';
import RabbitMQ from '../configs/rabbitmq.config';
import Redis from '../configs/redis.config';
import { DEFAULT_PROPERTIES_SKIP, DEFAULT_PROPERTIES_TAKE } from '../constants/pagination';
import { PROPERTY_QUEUE } from '../constants/rabbitmq';
import { IOwnerFilterProperties } from '../interfaces/property';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { propertySchema } from '../schemas/property.schema';
import {
    createPropertyService,
    deletePropertyService,
    getNotDeletedPropertiesByOwnerIdService,
    getNotDeletedPropertiesService,
    getNotDeletedPropertyService,
    getNotPendingPropertiesService,
    getPropertyBySlugService,
    getPropertyStatusService,
    updatePropertiesStatusService,
    updatePropertyService,
} from '../services/property.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError, { EntryError } from '../utils/error.util';
import { uploadFiles } from '../utils/uploadToFirebase.util';

const REDIS_KEY = {
    ALL_PROPERTIES: 'properties:all',
    PROPERTY: 'properties:',
};

export const createProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[] | undefined;
        const imageUrls: Array<string> = [];

        if (files) imageUrls.push(...files.map((file) => file.originalname));

        const safePare = propertySchema.safeParse({
            ...req.body,
            images: imageUrls,
            ...(typeof req.body.conditions === 'string' && { conditions: JSON.parse(req.body.conditions) }),
        });

        if (!safePare.success)
            throw convertZodIssueToEntryErrors({
                issue: safePare.error.issues,
            });

        if (files) {
            const images = await uploadFiles({ files, folder: 'property-service' });

            imageUrls.length = 0;

            imageUrls.push(...images);
        }

        const property = await createPropertyService({
            ...safePare.data,
            price: Number(safePare.data.price),
            ownerId: req.user!.id,
            images: imageUrls,
        });

        RabbitMQ.getInstance().publishInQueue({
            exchange: PROPERTY_QUEUE.exchange,
            name: PROPERTY_QUEUE.name,
            message: {
                type: PROPERTY_QUEUE.type.CREATED,
                data: property,
            },
        });

        res.status(201).json(property);
    } catch (error) {
        next(error);
    }
};

export const updateProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[] | undefined;
        const imageUrls: Array<string> = req.body.imageUrls || [];
        const property_id = req.params.property_id;

        if (files) imageUrls.push(...files.map((file) => file.originalname));

        const safePare = propertySchema.safeParse({
            ...req.body,
            images: imageUrls,
            ...(typeof req.body.conditions === 'string' && { conditions: JSON.parse(req.body.conditions) }),
        });

        if (!safePare.success)
            throw convertZodIssueToEntryErrors({
                issue: safePare.error.issues,
            });

        if (files) {
            const images = await uploadFiles({ files, folder: 'property-service' });

            imageUrls.length = 0;

            imageUrls.push(...images);
        }

        const property = await updatePropertyService(property_id, {
            ...safePare.data,
            price: Number(safePare.data.price),
            ownerId: req.user!.id,
            images: imageUrls,
        });

        Redis.getInstance().getClient().del(REDIS_KEY.ALL_PROPERTIES);
        Redis.getInstance().getClient().del(`${REDIS_KEY.PROPERTY}${property.slug}`);

        elasticClient
            .delete({
                index: 'properties',
                id: property.property_id,
            })
            .then(() => console.log('Property deleted from ElasticSearch'))
            .catch((err) => console.error('ElasticSearch error:', err));

        RabbitMQ.getInstance().publishInQueue({
            exchange: PROPERTY_QUEUE.exchange,
            name: PROPERTY_QUEUE.name,
            message: {
                type: PROPERTY_QUEUE.type.UPDATED,
                data: property,
            },
        });

        res.status(201).json(property);
    } catch (error) {
        next(error);
    }
};

export const getNotPendingProperties = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const KEY = REDIS_KEY.ALL_PROPERTIES;

        const propertiesRedis = await Redis.getInstance().getClient().get(KEY);

        if (propertiesRedis) {
            res.status(200).json(propertiesRedis);
            return;
        }

        const properties = await getNotPendingPropertiesService();
        Redis.getInstance()
            .getClient()
            .set(KEY, properties, {
                ex: 60 * 60,
            })
            .then(() => console.log('Properties cached'));

        res.status(200).json(properties);
    } catch (error) {
        next(error);
    }
};

export const getNotDeletedProperties = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const take = Number(req.query.take || DEFAULT_PROPERTIES_TAKE);
        const skip = Number(req.query.skip || DEFAULT_PROPERTIES_SKIP);

        const properties = await getNotDeletedPropertiesService({
            skip,
            take,
        });

        res.status(200).json(properties);
    } catch (error) {
        next(error);
    }
};

export const getNotDeletedProperty = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { property_id } = req.params;

        const property = await getNotDeletedPropertyService(property_id);

        res.status(200).json(property);
    } catch (error) {
        next(error);
    }
};

export const getNotDeletedPropertiesByOwnerId = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const take = Number(req.query.take || DEFAULT_PROPERTIES_TAKE);
        const skip = Number(req.query.skip || DEFAULT_PROPERTIES_SKIP);
        const owner_id = req.user!.id;

        const filter: IOwnerFilterProperties = req.query;

        const properties = await getNotDeletedPropertiesByOwnerIdService({
            ...filter,
            price_from: filter.price_from && Number(filter.price_from),
            price_to: filter.price_to && Number(filter.price_to),
            deposit_from: filter.deposit_from && Number(filter.deposit_from),
            deposit_to: filter.deposit_to && Number(filter.deposit_to),
            skip,
            take,
            ownerId: owner_id,
        });

        res.status(200).json(properties);
    } catch (error) {
        next(error);
    }
};

export const getPropertyBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const KEY = `${REDIS_KEY.PROPERTY}${slug}`;
        const propertyRedis = await Redis.getInstance().getClient().get(KEY);

        if (propertyRedis) {
            res.status(200).json(propertyRedis);
            return;
        }

        const property = await getPropertyBySlugService(slug);
        Redis.getInstance()
            .getClient()
            .set(KEY, property, {
                ex: 60 * 60,
            })
            .then(() => console.log('Property cached'));

        res.status(200).json(property);
    } catch (error) {
        next(error);
    }
};

export const searchProperties = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            q,
            take = DEFAULT_PROPERTIES_TAKE,
            skip = DEFAULT_PROPERTIES_SKIP,
            min_price,
            max_price,
            amenities,
            bedroom,
            bathroom,
            furniture,
            city,
            district,
            ward,
        } = req.query;

        const filter: QueryDslQueryContainer[] = [];
        const must: QueryDslQueryContainer[] = [];

        if (Array.isArray(amenities)) {
            amenities.forEach((amenity) =>
                filter.push({
                    match: {
                        'attributes.attribute_name': {
                            query: amenity as string,
                            operator: 'and',
                        },
                    },
                }),
            );
        }

        if (bedroom) {
            filter.push({
                bool: {
                    must: [
                        {
                            match: {
                                'conditions.condition_value': {
                                    query: `${bedroom} phòng`,
                                    operator: 'and',
                                    // start with 2 phòng
                                },
                            },
                        },
                        {
                            match: {
                                'conditions.condition_type': {
                                    query: 'Phòng ngủ',
                                    operator: 'and',
                                },
                            },
                        },
                    ],
                },
            });
        }

        if (bathroom) {
            filter.push({
                bool: {
                    must: [
                        {
                            match: {
                                'conditions.condition_value': {
                                    query: `${bathroom} phòng`,
                                    operator: 'and',
                                },
                            },
                        },
                        {
                            match: {
                                'conditions.condition_type': {
                                    query: 'Phòng tắm',
                                    operator: 'and',
                                },
                            },
                        },
                    ],
                },
            });
        }

        if (furniture) {
            filter.push({
                bool: {
                    must: [
                        {
                            match: {
                                'conditions.condition_value': {
                                    query: furniture as string,
                                    operator: 'and',
                                },
                            },
                        },
                        {
                            match: {
                                'conditions.condition_type': {
                                    query: 'Nội thất',
                                    operator: 'and',
                                },
                            },
                        },
                    ],
                },
            });
        }

        if (city) {
            const mustAddress: QueryDslQueryContainer[] = [
                {
                    match: {
                        'address.city': {
                            query: city as string,
                            operator: 'and',
                        },
                    },
                },
            ];

            if (district) {
                mustAddress.push({
                    match: {
                        'address.district': {
                            query: district as string,
                            operator: 'and',
                        },
                    },
                });
            }

            if (ward) {
                mustAddress.push({
                    match: {
                        'address.ward': {
                            query: ward as string,
                            operator: 'and',
                        },
                    },
                });
            }

            filter.push({
                bool: {
                    must: mustAddress,
                },
            });
        }

        if (Number(min_price) >= 0)
            filter.push({
                range: {
                    prices: {
                        gte: Number(min_price),
                    },
                },
            });

        if (Number(max_price) >= 0)
            filter.push({
                range: {
                    prices: {
                        lte: Number(max_price),
                    },
                },
            });

        if (q) {
            must.push({
                query_string: {
                    query: String(q),
                },
            });
        }

        const result = await elasticClient.search({
            index: 'properties',
            body: {
                query: {
                    bool: {
                        must,
                        filter,
                    },
                },
                size: Number(take),
                from: Number(skip),
            },
        });

        const searchResult = result.hits.hits.map((item) => item._source);

        res.status(200).json(searchResult);
    } catch (error) {
        next(error);
    }
};

export const deleteProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { property_id } = req.params;
        const user_id = req.user!.id;

        if (!property_id) throw new CustomError(400, 'Property id is required');

        const response = await deletePropertyService({
            property_id: property_id,
            owner_id: user_id,
        });

        RabbitMQ.getInstance().publishInQueue({
            exchange: PROPERTY_QUEUE.exchange,
            name: PROPERTY_QUEUE.name,
            message: {
                type: PROPERTY_QUEUE.type.DELETED,
                data: {
                    property_id,
                },
            },
        });

        elasticClient.delete({
            index: 'properties',
            id: property_id,
        });

        res.status(response.status).json(response);
    } catch (error) {
        next(error);
    }
};

export const updatePropertiesStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { properties, status, reason } = req.body;

        if (!properties || !status) throw new CustomError(400, 'Properties and status are required');
        if (!Array.isArray(properties)) throw new CustomError(400, 'Properties must be an array');
        if (status !== PropertyStatus.ACTIVE && status !== PropertyStatus.REJECTED)
            throw new CustomError(400, 'Status must be either ACTIVE or REJECTED');

        if (status === PropertyStatus.REJECTED && !reason)
            throw new EntryError(400, 'Reason is required when status is REJECTED', [
                {
                    field: 'reason',
                    error: 'Reason is required when status is REJECTED',
                },
            ]);

        const response = await updatePropertiesStatusService({
            properties,
            status,
            reason,
        });

        Redis.getInstance().getClient().del(REDIS_KEY.ALL_PROPERTIES);

        if (status === PropertyStatus.ACTIVE) {
            elasticClient
                .bulk({
                    index: 'properties',
                    body: response.flatMap((property) => [{ index: { _id: property.property_id } }, property]),
                })
                .then(() => console.log('Properties added to ElasticSearch'))
                .catch((err) => console.error('ElasticSearch error:', err));
        } else {
            elasticClient
                .bulk({
                    operations: response.map((item) => ({
                        delete: {
                            _id: item.property_id,
                        },
                    })),
                    index: 'properties',
                })
                .then(() => console.log('Properties deleted from ElasticSearch'))
                .catch((err) => console.error('ElasticSearch error:', err));
        }

        response.forEach((item) =>
            RabbitMQ.getInstance().publishInQueue({
                exchange: PROPERTY_QUEUE.exchange,
                name: PROPERTY_QUEUE.name,
                message: {
                    type: PROPERTY_QUEUE.type.UPDATED,
                    data: item,
                },
            }),
        );

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const updateVisiblePropertiesStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { properties, status } = req.body;
        const user_id = req.user!.id;

        if (!properties || !status) throw new CustomError(400, 'Properties and status are required');
        if (!Array.isArray(properties)) throw new CustomError(400, 'Properties must be an array');
        if (status !== PropertyStatus.ACTIVE && status !== PropertyStatus.INACTIVE)
            throw new CustomError(400, 'Status must be either ACTIVE or INACTIVE');

        const response = await updatePropertiesStatusService({
            properties,
            status,
            owner_id: user_id,
        });

        Redis.getInstance().getClient().del(REDIS_KEY.ALL_PROPERTIES);

        if (status === PropertyStatus.ACTIVE) {
            elasticClient
                .bulk({
                    index: 'properties',
                    body: response.flatMap((property) => [{ index: { _id: property.property_id } }, property]),
                })
                .then(() => console.log('Properties added to ElasticSearch'))
                .catch((err) => console.error('ElasticSearch error:', err));
        } else {
            elasticClient
                .bulk({
                    operations: response.map((item) => ({
                        delete: {
                            _id: item.property_id,
                        },
                    })),
                    index: 'properties',
                })
                .then(() => console.log('Properties deleted from ElasticSearch'))
                .catch((err) => console.error('ElasticSearch error:', err));
        }

        response.forEach((item) =>
            RabbitMQ.getInstance().publishInQueue({
                exchange: PROPERTY_QUEUE.exchange,
                name: PROPERTY_QUEUE.name,
                message: {
                    type: PROPERTY_QUEUE.type.UPDATED,
                    data: item,
                },
            }),
        );

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const getPropertyStatus = (_req: Request, res: Response, next: NextFunction) => {
    try {
        res.json(getPropertyStatusService());
    } catch (error) {
        next(error);
    }
};
