import { QueryDslQueryContainer, SearchResponse, Sort } from '@elastic/elasticsearch/lib/api/types';
import { PropertyStatus, UserPropertyInteraction, UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import elasticClient from '../configs/elastic.config';
import RabbitMQ from '../configs/rabbitmq.config';
import Redis from '../configs/redis.config';
import { DEFAULT_PROPERTIES_SKIP, DEFAULT_PROPERTIES_TAKE } from '../constants/pagination';
import { PROPERTY_QUEUE } from '../constants/rabbitmq';
import redis from '../constants/redis';
import { IPaginationResponse } from '../interface/pagination';
import { IOwnerFilterProperties, IResProperty } from '../interface/property';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { propertySchema } from '../schemas/property.schema';
import { getAvailableContractService } from '../services/contract.service';
import { createNotificationService, deleteNotificationsByDocIdService } from '../services/notification.service';
import {
    countNotPendingPropertiesService,
    createPropertyService,
    deletePropertyService,
    getNotDeletedPropertiesByOwnerIdService,
    getNotDeletedPropertiesService,
    getNotDeletedPropertyService,
    getNotPendingPropertiesService,
    getPropertiesCbbService,
    getPropertyBySlugService,
    getPropertyStatusService,
    updatePropertiesStatusService,
    updatePropertyService,
} from '../services/property.service';
import {
    getAllFavoritePropertyInteractionsService,
    getAllPropertyInteractionService,
    getFavoritePropertyInteractionBySlugService,
} from '../services/propertyInteraction.service';
import { findUserByIdService } from '../services/user.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError, { EntryError } from '../utils/error.util';
import getPageInfo from '../utils/getPageInfo';
import { uploadFiles } from '../utils/uploadToFirebase.util';

const REDIS_KEY = redis.PROPERTY;

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

        findUserByIdService(req.user!.id)
            .then((user) =>
                createNotificationService({
                    body: `Bất động sản **${property.title}** của **${user?.name}** đang chờ duyệt`,
                    title: 'Bất động sản mới',
                    type: 'ADMIN_PROPERTY',
                    from: req.user!.id,
                    toRole: 'admin',
                    docId: property.propertyId,
                }),
            )
            .then(() => console.log('Notification created'))
            .catch((err) => console.error('Notification error:', err));

        res.status(201).json(property);
    } catch (error) {
        next(error);
    }
};

export const updateProperty = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[] | undefined;
        const imageInitials = Array.isArray(req.body.imageUrls)
            ? req.body.imageUrls
            : (req.body.imageUrls && JSON.parse(req.body.imageUrls)) || [];
        const imageUrls: Array<string> = [...imageInitials];
        const propertyId = req.params.propertyId;

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

            imageUrls.push(...imageInitials, ...images);
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

        findUserByIdService(req.user!.id)
            .then((user) =>
                createNotificationService({
                    body: `Bất động sản **${property.title}** của **${user?.name}** đã được cập nhật`,
                    title: 'Bất động sản cập nhật',
                    type: 'ADMIN_PROPERTY',
                    from: req.user!.id,
                    toRole: 'admin',
                    docId: property.propertyId,
                }),
            )
            .then(() => console.log('Notification created'))
            .catch((err) => console.error('Notification error:', err));

        res.status(200).json(property);
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
        const city = req.query.city as string;
        const district = req.query.district as string;
        const ownerId = req.query.ownerId as string;
        const ownerName = req.query.ownerName as string;
        const propertyId = req.query.propertyId as string;
        const status = req.query.status as PropertyStatus;
        const title = req.query.title as string;
        const ward = req.query.ward as string;
        const sortField = req.query.sortField as string;
        const sortOrder = req.query.sortOrder as string;

        const properties = await getNotDeletedPropertiesService({
            skip,
            take,
            city,
            district,
            ownerId,
            ownerName,
            propertyId,
            status,
            title,
            ward,
            sortField,
            sortOrder,
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
        const ownerId = req.user!.id;
        const sortField = req.query.sortField as string;
        const sortOrder = req.query.sortOrder as string;

        const filter: IOwnerFilterProperties = req.query;

        const properties = await getNotDeletedPropertiesByOwnerIdService({
            ...filter,
            priceFrom: filter.priceFrom && Number(filter.priceFrom),
            priceTo: filter.priceTo && Number(filter.priceTo),
            depositFrom: filter.depositFrom && Number(filter.depositFrom),
            depositTo: filter.depositTo && Number(filter.depositTo),
            skip,
            take,
            ownerId,
            sortField,
            sortOrder,
        });

        res.status(200).json(properties);
    } catch (error) {
        next(error);
    }
};

export const getPropertyBySlug = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const KEY = `${REDIS_KEY.PROPERTY}${slug}`;
        const propertyRedis = await Redis.getInstance().getClient().get(KEY);

        if (propertyRedis) {
            res.status(200).json(propertyRedis);
            return;
        }

        const queries = [];

        queries.push(getPropertyBySlugService(slug));

        const userId = req.user?.id;

        if (userId) {
            queries.push(getFavoritePropertyInteractionBySlugService(userId, slug));
        } else {
            queries.push(Promise.resolve({}));
        }

        const [property, interaction] = await Promise.all(queries);
        Redis.getInstance()
            .getClient()
            .set(KEY, property, {
                ex: 60 * 60,
            })
            .then(() => console.log('Property cached'));

        res.status(200).json({
            ...property,
            isFavorite: Boolean(interaction),
        });
    } catch (error) {
        next(error);
    }
};

export const searchProperties = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
            type,
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

        if (type) {
            filter.push({
                match: {
                    'type.name': {
                        query: type as string,
                        operator: 'and',
                    },
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
            sortElastic = { createdAt: 'desc' };
        } else if (sort === 'oldest') {
            sortElastic = { createdAt: 'asc' };
        }

        const queries = [];

        queries.push(
            elasticClient.search({
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
            }),
        );

        const userId = req.user?.id;
        if (userId) {
            queries.push(getAllFavoritePropertyInteractionsService(userId));
        } else {
            queries.push(Promise.resolve([]));
        }

        const data: any[] = await Promise.all(queries);

        const result: SearchResponse<any> = data[0];
        const interactions: UserPropertyInteraction[] = data[1];

        const searchResult = result.hits.hits.map((item) => {
            const property: IResProperty = item._source as IResProperty;

            const interaction = interactions.find(
                (interaction: any) => interaction.property.propertyId === property.propertyId,
            );

            return {
                ...property,
                isFavorite: Boolean(interaction),
            };
        });
        const total = result.hits.total;
        const totalProperties = total ? (typeof total === 'number' ? total : total.value) : 0;

        const responseResult: IPaginationResponse<IResProperty> = {
            data: searchResult,
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

        const contract = await getAvailableContractService(propertyId);

        if (contract) throw new CustomError(400, `Bất động sản đang có hợp đồng`);

        const userId = req.user!.id;
        const userTypes = req.user!.userTypes as UserType[];

        if (!propertyId) throw new CustomError(400, 'Mã bất động sản không hợp lệ');

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

        elasticClient
            .deleteByQuery({
                index: 'properties',
                body: {
                    query: {
                        match: {
                            propertyId,
                        },
                    },
                },
            })
            .then(() => console.log('Property deleted from ElasticSearch'))
            .catch((err) => console.error('ElasticSearch error:', err));

        deleteNotificationsByDocIdService({
            docId: propertyId,
            userId,
            userTypes,
        })
            .then(() => console.log('Notifications deleted of property'))
            .catch((err) => console.error('Notification error:', err));

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

        response.map((item) =>
            createNotificationService({
                body: `Tài sản **${item.title}** của bạn đã ${
                    status === PropertyStatus.ACTIVE ? 'được duyệt' : 'bị từ chối vì lý do: ' + reason
                }`,
                title: `${status === PropertyStatus.ACTIVE ? 'Duyệt' : 'Từ chối'} tài sản`,
                type: 'OWNER_DETAIL_PROPERTY',
                to: item.owner.userId,
                docId: item.propertyId,
            })
                .then(() => console.log('Notification created'))
                .catch((err) => console.error('Notification error:', err)),
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

export const getPropertiesCbb = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const properties = await getPropertiesCbbService(userId);

        res.status(200).json(properties);
    } catch (error) {
        next(error);
    }
};

export const suggestSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.query.query as string;

        if (!query) return [];

        const result = await elasticClient.search({
            index: 'properties',
            body: {
                size: 5,
                query: {
                    multi_match: {
                        query,
                        fields: [
                            'title^3',
                            'description',
                            'address.street',
                            'address.district',
                            'address.city',
                            'type.name',
                        ],
                        type: 'bool_prefix',
                        fuzziness: 'AUTO',
                        operator: 'and',
                    },
                },
                _source: ['title', 'slug', 'images'],
            },
        });

        res.json(result.hits.hits.map((item: any) => item._source));
    } catch (error) {
        next(error);
    }
};

export const suggest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const suggestProperties = await Redis.getInstance().getClient().get(`$suggestProperties:${userId}`);
        console.log('🚀 ~ suggest ~ suggestProperties:', Boolean(suggestProperties));

        if (suggestProperties) {
            res.status(200).json(suggestProperties);
            return;
        }

        const interactions = await getAllPropertyInteractionService(userId);
        const lastInteraction = interactions.at(-1)?.property;

        const favoriteIds = interactions
            .filter((i) => i.interactionType === 'FAVORITED')
            .map((i) => i.property.propertyId);

        const viewedIds = interactions.filter((i) => i.interactionType === 'VIEWED').map((i) => i.property.propertyId);

        const result = await elasticClient.search({
            index: 'properties',
            body: {
                size: 10,
                query: {
                    bool: {
                        must: {
                            multi_match: {
                                query: interactions.at(-1)?.property.title || '',
                                fields: ['title^3', 'description', 'address.district^2', 'type.name^2'],
                                type: 'best_fields',
                                fuzziness: 'AUTO',
                            },
                        },
                        should: [
                            {
                                terms: {
                                    propertyId: favoriteIds,
                                    boost: 2.0,
                                },
                            },
                            {
                                terms: {
                                    propertyId: viewedIds,
                                    boost: 1.5,
                                },
                            },
                            {
                                more_like_this: {
                                    fields: ['type.name', 'address.district', 'description'],
                                    like: [
                                        {
                                            _index: 'properties',
                                            doc: {
                                                // type: lastInteraction?.type.name,
                                                'address.district': lastInteraction?.address?.district,
                                                price: lastInteraction?.price,
                                                description: lastInteraction?.description,
                                            },
                                        },
                                    ],
                                    min_term_freq: 1,
                                    max_query_terms: 12,
                                    boost: 1.2,
                                },
                            },
                            // Price range similarity
                            {
                                range: {
                                    price: {
                                        gte: (lastInteraction?.price || 0) * 0.8,
                                        lte: (lastInteraction?.price || 0) * 1.2,
                                        boost: 1.1,
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        });

        const suggestions = result.hits.hits.map((item: any) => item._source);

        Redis.getInstance()
            .getClient()
            .set(`$suggestProperties:${userId}`, JSON.stringify(suggestions), {
                ex: 3600, // 1 hour
                type: 'string',
            })
            .then(() => console.log('Suggest properties cached'))
            .catch((error: any) => console.error('Error set redis:', error));

        res.status(200).json(suggestions);
    } catch (error) {
        next(error);
    }
};
