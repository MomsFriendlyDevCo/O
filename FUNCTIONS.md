O function reference
====================
All function help is accessible using `o <function> --help`.


**Functions by purpose:**

* **Start-points** - [o find](#o-find), [o stash](#o-stash)
* **End-points** - [o save](#o-save), [o-stash](#o-stash)
* **Fetching data** - [o find](#o-find), [o populate](#o-populate)
* **Summarizing data** - [o count](#o-count), [o progress](#o-progress), [o throttle](#o-throttle)
* **Filtering documents** - [o find](#o-find), [o filter](#o-filter), [o limit](#o-limit), [o skip](#o-skip), [o sort](#o-sort), [o uniq](#o-uniq)
* **Pulling apart documents or drilling down** - [o ids](#o-ids), [o map](#o-map), [o pluck](#o-pluck), [o select](#o-select), [o thru](#o-thru)
* **Changing data** - [o map](#o-map), [o set](#o-set)
* **Integration with external scripts** - [o map](#o-map), [o thru](#o-thru)
* **Database meta information** - [o collections](#o-collections)
* **O meta information** - [o profile](#o-profile), [o-stash](#o-stash)


o
-

```
Usage: o <function> [arguments]

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information

Environment variables:
  O              Set the string ID of the profile to use from the users ~/.o INI file
  O_PROFILE      Set various profile options at once, can be JSON, HanSON or key=val CSV format
```


o collections
-------------

```
Usage: o collections [arguments]

Output the available collections

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information
```


o count
-------

```
Usage: o count [collection] [query...]

Count the number of documents in a collection (or run a query and count the results)

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information

Notes:
  * This function uses the same query system as `o find`
```


o filter
--------

```
Usage: o filter <queries...>

Filter a document stream using MongoDB / Sift syntax

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information
```


o find
-------

```
Usage: o find <collection> [query...]

Fetch documents from a collection with an optional query

Options:
  -V, --version             output the version number
  -v, --verbose             Be verbose - use multiple to increase verbosity
  -1, --one                 Fetch only the first document as an object (not an array)
  -c, --count               Count documents rather than return them
  -s, --select <fields...>  Select a CSV of fields (may be specified multiple times (default: [])
  -o, --sort <fields...>    Sort by a CSV of fields (sort decending with a "-" prefix, may be specified multiple times) (default: [])
  -l, --limit <number>      Limit the result to the first number of documents
  -k, --skip <number>       Skip over the first number of documents
  -n, --dry-run             Dont actually run anything, return an empty array
  -d, --delay <timestring>  Add a delay to each record retrieval (default: 0)
  -p, --pluck [field]       Return only an array of the single matching field
  -i, --ids                 Shorthand for --pluck=_id
  --count-exact             Insist on the exact count of documents rather than the much quicker best estimate
  -h, --help                output usage information

Notes:
  * The select function is passed directly onto the aggregation projection, if you want more complex selection use `o select` or `o pluck`
```


o ids
-----

```
Usage: o ids [collection] [query...]

Return an array of IDs from the given documents (from a pipe or from a query)

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information

Notes:
  * This function uses the same query system as `o find`
```


o limit
-------

```
Usage: o limit <number>

Return only a certain number of documents within a collection

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information
```


o map
-----

```
Usage: o map [--collection] <_.lodashFunc>...

Run a stream of documents though a Javascript function

Options:
  -V, --version     output the version number
  -v, --verbose     Be verbose - use multiple to increase verbosity
  -c, --collection  Run the function on the entire collection rather than on individual documents
  -h, --help        output usage information

Notes:
  * Use "#" in the arg list to designate where the document should be placed in the input parameters (e.g. (`_.keys(#)`)
  * If no brackets are used the document is placed in the one and only input parameter (e.g. `_.keys`)
  * Named string functions beginning with `_.` are run via Lodash
  * Using --collection causes the entire collection to be held in memory (and blocks) which could cause out-of-memory errors on large data sets
  * All functions are run in series as promise resolutions - i.e. returning a promise will stall for resolution before continuing to next function
```


o pluck
-------

```
Usage: o pluck <field>

Extract a single field from a collection and return it as the mapped value

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  --flatten      Flatten any complex endpoints into multiple returns
  -h, --help     output usage information

Notes:
  * `o pluck` and `o select` can both iterate down tree structures to obtain multiple results, use --flatten to squish these into a flat list
```


o populate
----------

```
Usage: o populate <paths[@collection][=mapping]...>

Extend a sub-object field by its ID

Options:
  -V, --version        output the version number
  -v, --verbose        Be verbose - use multiple to increase verbosity
  --collection <name>  Use the specified collection name instead of the document._collection meta property
  --select <fields>    Only pull the specified fields
  -h, --help           output usage information

Notes:
  * Paths can be specified in dotted notation format
  * Adding a '@collection' specifier will use that collection instead of guessing
  * Adding a mapping will populate the full object at the specified path instead of overwriting the original
  * If no schema is available to determine the reference the field name is tried followed by its plural before giving up
```


o profile
-------

```
Usage: o profile [profile]

Output the currently active profile (or show other profiles)

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -l, --list     List all known profiles
  --no-obscure   Disable obscuring of things that look like passwords
  -h, --help     output usage information
```


o progress
-------

```
Usage: o progress [--refresh <timestring> | --per <number>]

Reduce the throughput of documents to the specified number of items per time period

Options:
  -V, --version           output the version number
  -v, --verbose           Be verbose - use multiple to increase verbosity
  --refresh <timestring>  How often to output a progress message (default is 1s)
  --per <timestring>      How many documents to update by
  --prefix <string>       What prefix to use when outputting (default is "Processed")
  --suffix <string>       What suffix to use when outputting (default is "documents")
  -h, --help              output usage information
```


o save
------

```
Usage: o save [collection]

Save a changed document (requires either a collection specifying OR the _collection meta key in each document)

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -n, --dry-run  Dont actually save anything, just say what would be saved
  -h, --help     output usage information
```


o select
--------

```
Usage: o select <field...>

Select a series of fields from an input collection

Options:
  -V, --version    output the version number
  -v, --verbose    Be verbose - use multiple to increase verbosity
  --no-meta        Also filter out the `_id` and `_collection` meta keys
  --no-id          Also filter out the `_id` meta key
  --no-collection  Also filter out the `_collection` meta key, which marks the source of the record when using a subsequent `o save` function
  -h, --help       output usage information

Notes:
  * Fields can be prefixed with "!" to omit instead of include
  * `o select` and `o pluck` can both iterate down tree structures to obtain multiple results
```


o set
-----

```
Usage: o set <field=value...>

Set fields within a collection of documents

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information

Notes:
  * Fields can be specified in dotted notation format
  * Fields containing any ES6 tags will be evaluated with the current document context e.g. `bar=${foo}` copies the value of `foo` into `bar`
```


o skip
------

```
Usage: o skip <number>

Return an offset of documents within a collection

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information
```


o sort
------

```
Usage: o sort [fields...]

Sort a collection of documents by given fields (this function BLOCKS)

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -m, --memory   use in-memory caching instead of disk
  -h, --help     output usage information

Notes:
  * Memory caching is extremely RAM intensive and large collections cause out-of-memory errors
  * If no fields are specified the top level element is used for comparison
  * Omit the field if the input is just an array of strings or numbers to compare those directly
```


o stash
-------

```
Usage: o stash [--save [reference]] | [--load [reference]]

Save the entire output stream against a reference

Options:
  -V, --version       output the version number
  -v, --verbose       Be verbose - use multiple to increase verbosity
  --save <reference>  Specifies that the output should be saved, this is the default functionality
  --load <reference>  Specifies that the output should be loaded
  --list              List all stashes
  --delete <glob>     Delete all stashes matching a glob
  -s, --silent        Dont display any output, just save
  --no-stream         Bypass streaming large collections to use the internal object emitter (this is used by some internal functions and not meant for humans)
  -h, --help          output usage information

Notes:
  * If no reference is given when saving a random two word name is used
  * If no reference is given when loading the most recent save is used
  * The `savePath` is variable is used as the location to save to, this can be set per-profile
  * If neither "save" or "load" is specified, "list" is assumed
  * Stashes can also be loaded within queries by prefixing entries with an "@". e.g. "{_id: {'$in': @myIds}}"
```


o throttle
----------

```
Usage: o throttle [--limit <number>] [--per <timestring>] [--delay <timestring>]

Reduce the throughput of documents to the specified number of items per time period

Options:
  -V, --version         output the version number
  -v, --verbose         Be verbose - use multiple to increase verbosity
  --limit <number>      Number of documents to limit per period
  --per <timestring>    Time period to limit to
  --delay <timestring>  Delay per record
  -h, --help            output usage information
```


o thru
------

```
Usage: o thru [arguments]

Pass an entire collection though an external function, returning the result

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -h, --help     output usage information

Notes:
  * This function is really just an alias for `o map --collection`, see that functions documentation for details
```


o uniq
------

```
Usage: o uniq [fields...]

Return a uniq set of document (by entire object or by one or more fields)

Options:
  -V, --version  output the version number
  -v, --verbose  Be verbose - use multiple to increase verbosity
  -m, --memory   use in-memory caching instead of disk
  -h, --help     output usage information

Notes:
  * Memory caching is extremely RAM intensive and large collections cause out-of-memory errors
  * If no fields are specified the top level element is used for comparison
  * Omit the field if the input is just an array of strings or numbers to compare those directly
```
