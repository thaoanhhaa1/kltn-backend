import {
    Address,
    Attribute,
    Property,
    PropertyAttribute,
    PropertyImage,
    RentalCondition,
    RentalPrice,
    User,
} from '@prisma/client';
import { PropertyInput } from './../schemas/property.schema';
import { IPagination } from './pagination';
import { IUserId } from './user';

export interface ICreateProperty extends PropertyInput {
    ownerId: number;
    images: string[];
}

export type IResRepositoryProperty = Property & {
    Address: Address;
    PropertyAttributes: (PropertyAttribute & {
        Attribute: Pick<Attribute, 'attribute_name' | 'attribute_type'>;
    })[];
    PropertyImages: Pick<PropertyImage, 'image_url'>[];
    RentalConditions: Pick<RentalCondition, 'condition_type' | 'condition_value'>[];
    RentalPrices: Pick<RentalPrice, 'rental_price' | 'start_date'>[];
    Owner: Omit<User, 'user_types' | 'status'>;
};

export type IResProperty = Property & {
    address: Address;
    attributes: Pick<Attribute, 'attribute_name' | 'attribute_type'>[];
    images: string[];
    conditions: Pick<RentalCondition, 'condition_type' | 'condition_value'>[];
    prices: number;
    owner: Omit<User, 'user_types' | 'status'>;
};

export type IDeleteProperty = Pick<Property, 'owner_id' | 'property_id'>;

export type IUpdateProperty = Exclude<ICreateProperty, 'slug'>;

export type IPropertyStatus = Pick<Property, 'status'>['status'];
export type IPropertyId = Pick<Property, 'property_id'>['property_id'];
export type IUpdatePropertyStatus = {
    property_id: IPropertyId;
    status: IPropertyStatus;
    user_id: number;
    isAdmin?: boolean;
};

export type IGetPropertiesWithOwnerId = IPagination & {
    ownerId: number;
};

export type IUpdatePropertiesStatus = {
    properties: IPropertyId[];
    status: IPropertyStatus;
    owner_id?: IUserId;
    reason?: string;
};

export interface IOwnerFilterProperties {
    title?: Property['title'];
    deposit_from?: Property['deposit'];
    deposit_to?: Property['deposit'];
    price_from?: RentalPrice['rental_price'];
    price_to?: RentalPrice['rental_price'];
    status?: Property['status'];
    city?: Address['city'];
    district?: Address['district'];
    ward?: Address['ward'];
}
