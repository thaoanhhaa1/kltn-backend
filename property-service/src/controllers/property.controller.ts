import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { NextFunction, Request, Response } from 'express';
import elasticClient from '../configs/elastic.config';
import RabbitMQ from '../configs/rabbitmq.config';
import Redis from '../configs/redis.config';
import { DEFAULT_PROPERTIES_SKIP, DEFAULT_PROPERTIES_TAKE } from '../constants/pagination';
import { PROPERTY_QUEUE } from '../constants/rabbitmq';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { propertySchema } from '../schemas/property.schema';
import {
    createPropertyService,
    deletePropertyService,
    getAllPropertiesService,
    getPropertyBySlugService,
    updatePropertyService,
} from '../services/property.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError from '../utils/error.util';
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

        Redis.getInstance().getClient().del(REDIS_KEY.ALL_PROPERTIES);

        elasticClient
            .index({
                index: 'properties',
                body: property,
            })
            .then(() => console.log('Property added to ElasticSearch'))
            .catch((err) => console.error('ElasticSearch error:', err));

        RabbitMQ.getInstance().sendToQueue(PROPERTY_QUEUE.name, {
            type: PROPERTY_QUEUE.type.CREATED,
            data: property,
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
            .index({
                index: 'properties',
                body: property,
            })
            .then(() => console.log('Property added to ElasticSearch'))
            .catch((err) => console.error('ElasticSearch error:', err));

        RabbitMQ.getInstance().sendToQueue(PROPERTY_QUEUE.name, {
            type: PROPERTY_QUEUE.type.UPDATED,
            data: property,
        });

        res.status(201).json(property);
    } catch (error) {
        next(error);
    }
};

export const getAllProperties = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const KEY = REDIS_KEY.ALL_PROPERTIES;

        const propertiesRedis = await Redis.getInstance().getClient().get(KEY);

        if (propertiesRedis) {
            res.status(200).json(propertiesRedis);
            return;
        }

        const properties = await getAllPropertiesService();
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

        const searchResult = await elasticClient.search({
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

        RabbitMQ.getInstance().sendToQueue(PROPERTY_QUEUE.name, {
            type: PROPERTY_QUEUE.type.DELETED,
            data: {
                property_id,
            },
        });

        res.status(response.status).json(response);
    } catch (error) {
        next(error);
    }
};
