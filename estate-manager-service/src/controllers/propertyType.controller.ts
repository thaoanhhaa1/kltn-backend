import { NextFunction, Request, Response } from 'express';
import { propertyTypeSchema } from '../schemas/propertyType.schema';
import { createPropertyTypeService, getPropertyTypesService } from '../services/propertyType.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

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
