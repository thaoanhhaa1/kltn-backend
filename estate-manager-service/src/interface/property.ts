import { Address, Attribute, Property, PropertyAttribute, RentalCondition, User } from '@prisma/client';
import { PropertyInput } from './../schemas/property.schema';
import { IPagination } from './pagination';
import { IUserId } from './user';

export interface ICreateProperty extends PropertyInput {
    ownerId: string;
    images: string[];
}

export type IResRepositoryProperty = Property & {
    attributes: (PropertyAttribute & {
        Attribute: Pick<Attribute, 'name' | 'type'>;
    })[];
};

export type IResProperty = Property & {
    attributes: Pick<Attribute, 'name' | 'type'>[];
};

export type IDeleteProperty = {
    propertyId: IPropertyId;
    ownerId: IUserId;
};

export type IUpdateProperty = Exclude<ICreateProperty, 'slug'>;

export type IPropertyStatus = Pick<Property, 'status'>['status'];
export type IPropertyId = Pick<Property, 'propertyId'>['propertyId'];
export type IUpdatePropertyStatus = {
    propertyId: IPropertyId;
    status: IPropertyStatus;
    userId: IUserId;
    isAdmin?: boolean;
};

export type IGetPropertiesWithOwnerId = IPagination & {
    ownerId: string;
};

export type IUpdatePropertiesStatus = {
    properties: IPropertyId[];
    status: IPropertyStatus;
    ownerId?: IUserId;
    reason?: string;
};

export interface IOwnerFilterProperties {
    title?: Property['title'];
    depositFrom?: Property['deposit'];
    depositTo?: Property['deposit'];
    priceFrom?: Property['price'];
    priceTo?: Property['price'];
    status?: Property['status'];
    city?: Address['city'];
    district?: Address['district'];
    ward?: Address['ward'];
}

export interface IUpdateRating {
    propertyId: IPropertyId;
    rating: number;
    count: number;
}

export type IGetNotDeletedProperties = IPagination & {
    propertyId?: IPropertyId;
    title?: Property['title'];
    ward?: Address['ward'];
    district?: Address['district'];
    city?: Address['city'];
    ownerId?: IUserId;
    ownerName?: User['name'];
    status?: Property['status'];
};
