import { QueryDslQueryContainer, Sort } from '@elastic/elasticsearch/lib/api/types';
import { PropertyStatus } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import elasticClient from '../configs/elastic.config';
import RabbitMQ from '../configs/rabbitmq.config';
import Redis from '../configs/redis.config';
import { DEFAULT_PROPERTIES_SKIP, DEFAULT_PROPERTIES_TAKE } from '../constants/pagination';
import { PROPERTY_QUEUE } from '../constants/rabbitmq';
import { IPaginationResponse } from '../interface/pagination';
import { IOwnerFilterProperties, IResProperty } from '../interface/property';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { propertySchema } from '../schemas/property.schema';
import {
    countNotPendingPropertiesService,
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
import getPageInfo from '../utils/getPageInfo';
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
            ...(typeof req.body.type === 'string' && { type: JSON.parse(req.body.type) }),
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
        const propertyId = req.params.propertyId;

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

        const property = await updatePropertyService(propertyId, {
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
                id: property.propertyId,
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
        const { propertyId } = req.params;

        const property = await getNotDeletedPropertyService(propertyId);

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
            priceFrom: filter.priceFrom && Number(filter.priceFrom),
            priceTo: filter.priceTo && Number(filter.priceTo),
            depositFrom: filter.depositFrom && Number(filter.depositFrom),
            depositTo: filter.depositTo && Number(filter.depositTo),
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
            minPrice,
            maxPrice,
            amenities,
            bedroom,
            bathroom,
            furniture,
            floor,
            city,
            district,
            ward,
            sort,
        } = req.query;

        const filter: QueryDslQueryContainer[] = [];
        const must: QueryDslQueryContainer[] = [];

        if (Array.isArray(amenities)) {
            amenities.forEach((amenity) =>
                filter.push({
                    match: {
                        'attributes.name': {
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
                                'rentalConditions.value': {
                                    query: `${bedroom} phòng`,
                                    operator: 'and',
                                    // start with 2 phòng
                                },
                            },
                        },
                        {
                            match: {
                                'rentalConditions.type': {
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
                                'rentalConditions.value': {
                                    query: `${bathroom} phòng`,
                                    operator: 'and',
                                },
                            },
                        },
                        {
                            match: {
                                'rentalConditions.type': {
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
                                'rentalConditions.value': {
                                    query: furniture as string,
                                    operator: 'and',
                                },
                            },
                        },
                        {
                            match: {
                                'rentalConditions.type': {
                                    query: 'Nội thất',
                                    operator: 'and',
                                },
                            },
                        },
                    ],
                },
            });
        }

        if (floor) {
            filter.push({
                bool: {
                    must: [
                        {
                            match: {
                                'rentalConditions.value': {
                                    query: `${floor} tầng`,
                                    operator: 'and',
                                },
                            },
                        },
                        {
                            match: {
                                'rentalConditions.type': {
                                    query: 'Số tầng',
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

        if (Number(minPrice) >= 0)
            filter.push({
                range: {
                    price: {
                        gte: Number(minPrice),
                    },
                },
            });

        if (Number(maxPrice) >= 0)
            filter.push({
                range: {
                    price: {
                        lte: Number(maxPrice),
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

        let sortElastic: Sort | undefined;

        if (sort === 'price_asc') {
            sortElastic = { price: 'asc' };
        } else if (sort === 'price_desc') {
            sortElastic = { price: 'desc' };
        } else if (sort === 'newest') {
            sortElastic = { updatedAt: 'desc' };
        } else if (sort === 'oldest') {
            sortElastic = { createdAt: 'asc' };
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
                sort: sortElastic,
                size: Number(take),
                from: Number(skip),
            },
        });

        const searchResult = result.hits.hits.map((item) => item._source);
        const total = result.hits.total;
        const totalProperties = total ? (typeof total === 'number' ? total : total.value) : 0;

        const responseResult: IPaginationResponse<IResProperty> = {
            data: searchResult as IResProperty[],
            pageInfo: getPageInfo({
                count: totalProperties,
                skip: Number(skip),
                take: Number(take),
            }),
        };

        res.status(200).json(responseResult);
    } catch (error) {
        next(error);
    }
};

export const countNotPendingProperties = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const count = await countNotPendingPropertiesService();

        return res.status(200).json({
            data: count,
            status: 200,
            success: true,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user!.id;

        if (!propertyId) throw new CustomError(400, 'Property id is required');

        const response = await deletePropertyService({
            propertyId: propertyId,
            ownerId: userId,
        });

        RabbitMQ.getInstance().publishInQueue({
            exchange: PROPERTY_QUEUE.exchange,
            name: PROPERTY_QUEUE.name,
            message: {
                type: PROPERTY_QUEUE.type.DELETED,
                data: {
                    propertyId,
                },
            },
        });

        elasticClient.delete({
            index: 'properties',
            id: propertyId,
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
                    body: response.flatMap((property) => [{ index: { _id: property.propertyId } }, property]),
                })
                .then(() => console.log('Properties added to ElasticSearch'))
                .catch((err) => console.error('ElasticSearch error:', err));
        } else {
            elasticClient
                .bulk({
                    operations: response.map((item) => ({
                        delete: {
                            _id: item.propertyId,
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
        const userId = req.user!.id;

        if (!properties || !status) throw new CustomError(400, 'Properties and status are required');
        if (!Array.isArray(properties)) throw new CustomError(400, 'Properties must be an array');
        if (status !== PropertyStatus.ACTIVE && status !== PropertyStatus.INACTIVE)
            throw new CustomError(400, 'Status must be either ACTIVE or INACTIVE');

        const response = await updatePropertiesStatusService({
            properties,
            status,
            ownerId: userId,
        });

        Redis.getInstance().getClient().del(REDIS_KEY.ALL_PROPERTIES);

        if (status === PropertyStatus.ACTIVE) {
            elasticClient
                .bulk({
                    index: 'properties',
                    body: response.flatMap((property) => [{ index: { _id: property.propertyId } }, property]),
                })
                .then(() => console.log('Properties added to ElasticSearch'))
                .catch((err) => console.error('ElasticSearch error:', err));
        } else {
            elasticClient
                .bulk({
                    operations: response.map((item) => ({
                        delete: {
                            _id: item.propertyId,
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
