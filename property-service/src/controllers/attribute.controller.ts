import { NextFunction, Request, Response } from 'express';
import {
    createAttributeService,
    deleteAttributeService,
    getAllAttributesCbbService,
    getAllAttributesService,
    getAttributeByIdService,
    updateAttributeService,
} from '../services/attribute.service';
import { attributeSchema } from '../schemas/attribute.schema';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

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

export const getAttributeById = async (req: Request, res: Response) => {
    try {
        const attribute = await getAttributeByIdService(req.params.id);
        if (attribute) {
            res.json(attribute);
        } else {
            res.status(404).json({ error: 'Attribute not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve attribute' });
    }
};

export const updateAttribute = async (req: Request, res: Response) => {
    try {
        const safeParse = attributeSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const attribute = await updateAttributeService(req.params.id, req.body);
        if (attribute) {
            res.json(attribute);
        } else {
            res.status(404).json({ error: 'Attribute not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update attribute' });
    }
};

export const deleteAttribute = async (req: Request, res: Response) => {
    try {
        await deleteAttributeService(req.params.id);
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete attribute' });
    }
};
