def document_to_product_info(product):
    attributes_dict = {
        'Amenity': [],
        'Highlight': [],
        'Facility': []
    }

    for attr in product.get('attributes', []):
        attr_type = attr['type']
        if attr_type in attributes_dict:
            attributes_dict[attr_type].append(attr['name'])

    return ({
        "title": product.get('title', ''),
        "description": product.get('description', ''),
        "type": product['type'].get('name', ''),
        "prices": product.get('price', ''),
        "address": {
            "street": product['address'].get('street', ''),
            "ward": product['address'].get('ward', ''),
            "district": product['address'].get('district', ''),
            "city": product['address'].get('city', '')
        },
        "conditions": [f"{cond['type']}: {cond['value']}" for cond in product.get('rentalConditions', [])],
        "attributes": attributes_dict,
        "slug": product.get('slug', '')
    })

def format_product_infos(product_infos):
    print(product_infos)

    return "\n\n".join([
            f"**Tiêu đề:** {p['title']}\n"
            f"**Mô tả:** {p['description']}\n"
            f"**Loại nhà:** {p['type']}\n"
            f"**Giá:** {p['prices']}\n"
            f"**Địa chỉ:** {p['address']['street']}, {p['address']['ward']}, {p['address']['district']}, {p['address']['city']}\n"
            f"**Điều kiện:** {', '.join(p['conditions'])}\n"
            f"**Tiện ích:** {', '.join(p['attributes'].get('Amenity', []))}\n"
            f"**Điểm nổi bật:** {', '.join(p['attributes'].get('Highlight', []))}\n"
            f"**Cơ sở vật chất:** {', '.join(p['attributes'].get('Facility', []))}\n"
            f"**Slug:** {p['slug']}" 
            for p in product_infos
        ])