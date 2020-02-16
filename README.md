<p align="center">
  <img src="https://github.com/MomsFriendlyDevCo/O/raw/master/assets/o.png"/>
</p>

O
=
A Command Line JSON manipulation toolbox aimed mainly at MongoDB.


**O fundamentals:**

1. All O functions begin with `o function`, where the function name is the second argument
2. O primarily handles with arrays of objects (henceforth "collections", where each item is a "document")
3. All functions are either streaming or blocking. Streaming scripts take a document at a time in a pipeline, operate on it then move to the next. Blocking functions have to wait for the previous process to finish before they can operate. Efficiency occurs when as few blocking operations occur within a pipeline as possible. If blocking operations cannot be avoided they should be at the end of pipelines
4. Functions may use other functions where needed - `o count $COLLECTION $QUERY` is really just a wrapper for `o find --count $COLLECTION $QUERY` but when given an input stream count the documents instead
5. For ease of use, wherever JSON is specified as a query or input the [Hanson](https://github.com/timjansen/hanson) specification is also allowed
6. Documents retrieved with `o find` are decorated with the additional field `_collection` which is used by downstream commands like `o save` to determine which collection to save back to
7. All queries are processed by [Sift-Shorthand](https://github.com/hash-bang/sift-shorthand#readme) and support [Hanson](https://github.com/timjansen/hanson), `key=val` and other combinations


**Goals:**

* Use the default user shell, no weird internal command console
* Easy to understand at each point of the process - do one thing and do it well
* Pipeline optimized - each `o` function runs in its own thread usually across available CPU's to maximize throughput
* External tool compatible - All data is just streaming JSON text so its easy to plug into something that can process that
* Laughably inefficient - Designed for kludge fixes rather than actual everyday use. The following are counter examples of why this CLI should not be used:
	- `o find users | o select name` - Massive data selection which narrows down to a finite set. Use `o find users --select name` to reduce the initial fetch from the database
	- `o find users | o skip 3 | o limit 3` - Limit to 4-6 users, much easier to use `o find users --skip 3 --limit 3` in the initial find function
	- `o find users | o count` - Massive data pull from server only to count it. Use `o use minimal=true | ...` to enable minimal transfer or `o find users --count` instead to minimize overhead
	- `o find users | o find status=active` - Massive data pull only to filter in later process
* Sub-queries are inefficient but easy:
	- Finding all users by RegExp on company name is horrible but works - `o find users '{company: {$in: `o ids users name~=/ACME/`}}'`


Installation
------------
Install via NPM in the usual way:

```
npm i -g @momsfriendlydevco/o
```

(You may need a `sudo` prefix depending on your Node setup)



Other similar projects
----------------------
Since O specialises in JSON the following projects are also useful to provide, filter and mutate JSON based streams:

* [Jaywalker](https://github.com/hash-bang/jaywalker) - Extract JSON from a stream of junk text
* [JC](https://github.com/kellyjonbrazil/jc) - Various shell output as JSON (for supported parsers)
* [JQ](https://stedolan.github.io/jq/) - All-in-one JSON filtering and mutation


O functions
===========
A full list of O functions is available by either typing `o --help` or on in the [functions reference](./FUNCTIONS.md)


Frequently Asked Questions
==========================

* **Why "O"?** The main script name looks a little like a bullet point and is easy to type repeatedly into a console, this tool is also heavily influenced by [Monoxide](https://github.com/hash-bang/Monoxide) (of which the chemical symbol would be one Oxygen atom or "O")
* **Can O work with non-collection data?** Yes, O is relatively unopinionated as to the type of data it deals with but its mostly based around collections
* **How efficient is O** - Each O function runs in its own thread so provided the work in each thread is minimal this should run across the maximal number of CPU's your machine has
* **Can I plug in my own custom scripts?** - Yes, see the `o map` function which allows external functionality either per-document or for the entire collection
* **I have feedback or a suggestions** - Please contact [the author](mailto:m@ttcarter.com) who is always happy to get feedback


Profile options
===============
All settings are stored in `~/.o` (which can be overwritten with `.o` in the current working directory). All files are in a simple INI format with each profile specified as the group. The `global` group functions as the defaults for each subsequent profile. `default` is used when no specific profile is specified in the `O` environment variable.

Profiles are loaded in the following order with successive profiles overwriting the settings of the earlier ones:

1. `global` profile - loaded for all profiles to specify global settings
2. `output` profile - only loaded if the current `o` function is an endpoint-TTY (i.e. the final output pipeline before the output goes to a user). This profile is useful to set pretty print outputs when debugging
3. Profile specified by the `O` environment variable OR the `default` profile
4. Settings found in the `O_PROFILE` environment variable then overwrite any of the above


```
# Count users in the default profile
o count users

# Count users in the dev profile
O=dev o count users

# Count users in the production profile
O=production o count users
```

Each profile can be made up of any of the following settings:

| Option                         | Type                         | Default     | Description                                                                                                        |
|--------------------------------|------------------------------|-------------|--------------------------------------------------------------------------------------------------------------------|
| `uri`                          | `string`                     |             | The database URI (with optional protocol, auth details etc)                                                        |
| `connectionOptions`            | `Object`                     | `{}`        | Additional options to set when connecting                                                                          |
| `pretty`                       | `boolean` or `string`        | `false`     | Whether to output JSON in a pretty-printing format. See notes for values                                           |
| `prettyConfig`                 | `Object`                     | See below   | Various pretty-printing config options                                                                             |
| `prettyConfig.colors`          | `Object`                     | See code    | Color lookup table for various types. See [Jsome](https://github.com/Javascipt/Jsome#module-) reference            |
| `schemas`                      | `string ` / `array <string>` | `[]`        | Glob / Array of globs to scan when including schema files                                                          |
| `skipRawCollections`           | `boolean`                    | `false`     | If set collections present without a schema will be ignored                                                        |
| `includePaths`                 | `array <string>`             | See notes   | Array of globs to scan to discover `o` function files                                                              |
| `savePath`                     | `string`                     | `/tmp/o`    | Where to save / load output when using `o stash`. Defaults to system temp dir                                      |
| `mangle`                       | `Object`                     | See below   | Various data / field / collection mangling options                                                                 |
| `mangle.collections.lowerCase` | `boolean`                    | `true`      | Whether to automatically convert all collection requests to lower case (this matches Mongoose's default behaviour) |
| `mangle.json.dotted`           | `boolean`                    | `false`     | Rewrite dotted paths to a hierarchical object, disable this to use raw user specified paths                        |
| `mangle.fields.objectIds`      | `array <string>`             | `['*._id']` | A glob of collection + field paths to convert into OIDs before querying                                            |
| `logDepth`                     | `number`                     | `3`         | How deeply to output logged objects                                                                                |


**Notes:**

* Include paths default to the `o.js` script file path + `/functions/o.*.js` which includes the core of `o` functions
* As well as taking regular JSON formatting options `false` (default, don't format), `true` (use pretty-printing), the `pretty` option can also be `colors` (in which case the external [Jsome](https://github.com/Javascipt/Jsome) module is used or `paths` / `gron` / `gronk` in which case the [Gronk](https://github.com/hash-bang/gronk) module is used. Note that these two latter objects are one-way parsers and cannot be used in a pipeline.


Example command line usage
==========================
The following examples are separated across multiple lines for readability.
All of the examples here are usable within Bash or Zsh.

```
# Find all active users
> o find users status=active


# Group active users by company
> o find users status=active \|
	o group company


# Return a list of users names belonging to each company (by company name)
> o find users status=active \|
	o join company \|
	o group company \|
	o pluck name


# Find list all company names, with no users (i.e. orphaned companies)
> o find companies 
	o set userCount=`o count users company?=${_id}` \|
	o find userCount<1 \|
	o pluck name


# Set all users to active and save
> o find users \|
	o set status=active \|
	o save


# Delete all users who belong to a specific company
> o find users "{company: 123}" \|
	o set status=deleted \|
	o save


# Find one user by their name, open in the users editor then save back to disk
> o find users -1 'name~=Joe Random' \|
	o edit \|
	o save


# Set all users favourite colors to blue showing the users that change
> o find users \|
	o set favourite.color=blue \|
	o diff


# Output all users as a CSV file, open LibreOffice Calc to allow changes then save the data back
> o find users \|
	o format csv \|
	o edit --editor=localc \|
	o format \|
	o save


# Delete all users who belong to companies matched by regexp using a sub-query (short version using `o ids` convenience command)
> o find users company[]=`o ids users name~=/ACME/` \|
	o set status=deleted \|
	o save


# Delete all users who belong to companies matched by regexp using a sub-query (long version using full, expanded queries)
> o find users company[]=`\|
		o find users name~=/ACME/ \|
		o select _id \|
		o pluck _id
	` \|
	o set status=deleted \|
	o save


# Fetch all active users, expand the 'company' field, use it to find the company director (also a user) and return a unique list of those
> o find users status=active \|
	o join company \|
	o join company.director \|
	o pluck company.director \|
	o uniq


# Copy all active users from the production profile into the dev profile
> o use production \|
	o find users status=active \|
	o use dev \|
	o create


# Set all matching users passwords to their favourite color
> o find users username~=/forgetful/ \|
	o set 'password?=${favourites.color}' \|
	o save


# Copy existing users, adding "Evil " as a prefix and setting their status to unverified
> o find users \|
	o set 'name?=Evil ${name}' status=unverified \|
	o select !_id \|
	o create


# Find all duplicate usernames, sorted
> o find users --select username \|
	o group username \|
	o find length>1 \|
	o pluck \|
	o sort


# Perform an expensive operation (database processing time) on users limiting the hit on the database to one record per minute, adding a 10 second delay for each save
> o find users \|
	o throttle --limit 1 --per 1m \|
	o exec someExpensiveOperation \|
	o throttle --delay 10s \|
	o save
```

The [testkits](./test) contain many more examples. Specifically the [pipe testkit](./test/pipe.js) shows man of the base functions interacting with one another and their expected results.
