import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { propertySchema } from '../schemas/property.schema';
import { createPropertyService, getAllPropertiesService, getPropertyBySlugService } from '../services/property.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import { uploadFiles } from '../utils/uploadToFirebase.util';

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

        res.status(201).json(property);
    } catch (error) {
        next(error);
    }
};

export const getAllProperties = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const properties = await getAllPropertiesService();

        res.status(200).json(properties);
    } catch (error) {
        next(error);
    }
};

export const getPropertyBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const property = await getPropertyBySlugService(slug);

        res.status(200).json(property);
    } catch (error) {
        next(error);
    }
};
