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
    Owner: Omit<User, 'user_types'>;
};

export type IResProperty = Property & {
    address: Address;
    attributes: Pick<Attribute, 'attribute_name' | 'attribute_type'>[];
    images: string[];
    conditions: Pick<RentalCondition, 'condition_type' | 'condition_value'>[];
    prices: number;
    owner: Omit<User, 'user_types'>;
};

export type IDeleteProperty = Pick<Property, 'owner_id' | 'property_id'>;
