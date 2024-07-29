# Elasticsearch

## Query DSL

```JSON
{
  "query": {
    "match": {
      "message": {
        "query": "this is a test",
        "operator": "and"
      }
    }
  }
}
```

## match_bool_prefix

-   The `match_bool_prefix` query is the same as the `match` query, except that it uses the `bool` query to allow for more complex queries.
-   Example:

    -   The following query will return documents where the `message` field contains the terms `quick`, `brown`, and `f` in any order.

```JSON
{
  "query": {
    "match_bool_prefix": {
      "message": {
        "query": "quick brown f",
        "operator": "and"
      }
    }
  }
}
```

## match_phrase_prefix

-   The `match_phrase_prefix` query analyzes the text and creates a phrase query out of the analyzed text.
-   Example:
    -   The following query will return documents where the `message` field contains the terms `quick brown f` in the same order.
    -   This search would match a `message` value of `quick brown fox` or `two quick brown ferrets` but not `the fox is quick and brown`.
-   Using the match phrase prefix query for search autocompletion

## match_phrase

-   The `match_phrase` query analyzes the text and creates a phrase query out of the analyzed text.
-   Example:
    -   The following query will return documents where the `message` field contains the terms `quick brown` in the same order.
    -   Matches `quick brown fox` but not `quick fox brown` or `brown quick fox` or `brown a quick fox`.

## combined_fields

-   The `combined_fields` query is a specialized query that uses the `match` query internally on the `_all` field.
-   Example:
    -   The following query will return documents where the `_all` field contains the terms `quick brown` in any order.

```JSON
{
  "query": {
    "combined_fields": {
      "query": "quick brown",
      "fields": ["title", "body"]
    }
  }
}
```

## multi_match

-   The `multi_match` query builds on the `match` query to allow you to query multiple fields.
-   Example:
    -   The following query will return documents where the `title` or `body` fields contain the terms `quick brown` in any order.
    -   The `type` parameter specifies how the query terms should be combined. The default value is `best_fields`.
    -   The `best_fields` type is most useful when you are searching for documents that contain any of the terms in the query string.
    -   The `most_fields` type is most useful when you are searching for documents that contain most of the terms in the query string.
    -   The `cross_fields` type is most useful when you are searching for documents that contain all the terms in the query string but across different fields.

```JSON
{
  "query": {
    "multi_match": {
      "query": "quick brown",
      "fields": ["title", "body"]
    }
  }
}
```

## simple_query_string

-   The `simple_query_string` query is a simplified version of the `query_string` query.
-   Example:
    -   The following query will return documents where the `title` field contains the terms `quick` or `brown` but not `lazy`.
    -   The `default_operator` parameter specifies the default operator for query string queries. The default value is `or`.
    -   The `fields` parameter specifies which fields to search. If no fields are specified, the query will search all fields.
    -   The `minimum_should_match` parameter specifies the minimum number of clauses that must match for a document to be returned.
    -   The `quote_field_suffix` parameter specifies the suffix appended to quoted text in the query string.

```JSON
{
  "query": {
    "simple_query_string": {
      "query": "quick brown -lazy",
      "fields": ["title"]
    }
  }
}
```

## zero_terms_query

-   The `zero_terms_query` parameter specifies what to do when the query string is empty. The default behavior is to return no documents.
