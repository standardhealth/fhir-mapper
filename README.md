# FHIR Mapper

Library for mapping various forms of FHIR to mCODE by adding mCODE profiles onto the incoming FHIR. 

## Current Mappers
* Synthea FHIR => mCODE v0.5 (`src/mappers/SyntheaToV05.js`)
* Synthea FHIR => mCODE v0.9 (`src/mappers/SyntheaToV09.js`)
* Cerner Sandbox => mCODE v0.9 (`src/mappers/Cerner.js`)
* Open Epic DSTU2 FHIR => mCODE v0.9 (`src/mappers/OpenEpic.js`)

## Quickstart

Install into your project via yarn:

``` bash
$ yarn add fhir-mapper
```

In the file where the mapping needs to be done, import one of the supported mappers (e.g. Synthea) directly into the project. Here is an example of utilizing the Synthea mapper to add mCODE v0.5 profiles onto Synthea FHIR:

``` JavaScript
import SyntheaToV09 from 'fhir-mapper';

const mapper = new SyntheaToV09();

const json = {/* obtained Synthea FHIR json */};
const entries = [];

const resources = json.entry.map(e => e.resource);
const results = mapper.execute(resources);
const wrappedResults = results.map(resource => {
    return {
        fullUrl: `urn:uuid:${resource.id}`,
        resource,
        request: { method: 'POST', url: resource.resourceType }
    }
});
json.entry = wrappedResults;

entries.push(...bundle.entry); // Array of entries with mCODE profiles
```

## Local Development

To get started with local development for testing or adding/modifying mappers, first clone and install the dependencies:

``` bash
$ git clone https://github.com/standardhealth/fhir-mapper.git
$ yarn install
```

### Link to Desired Repository

Use `yarn link` to pull in `fhir-mapper` as a module into a project:

1. From the `fhir-mapper` project root directory, run `yarn link`
2. Change directory to the desired project where this module will be installed
3. From that project's root directory, run `yarn link fhir-mapper`

Now, changes made to the `fhir-mapper` code will automatically be reflected in the project's `node_modules` directory and update accordingly.

### Writing a new mapper (example)

Cases may arise where one needs to write a new mapper (e.g. to a different version of mCODE or from different FHIR).

Create the new mapper in `src/mapping/mappers/<your-mapper>.js` and import the mapper module to build the mapper. The following is an example of what a mapper could look like for applying mCODE profiles:

``` JavaScript
/* src/mapping/mappers/<your-mapper>.js */

const { AggregateMapper } = require('../mapper');

const applyProfile = (resource, profile) => {
    if (profile) {
        resource.meta = resource.meta || {};
        resource.meta.profile = resource.meta.profile || [];
        resource.meta.profile.unshift(profile); // ensure this profile is first in the list
    }
    return resource;
};

const DEFAULT_PROFILE = { /* some default profile */ };

const resourceMapping = {
    filter: () => true,
    default: (resource) => applyProfile(resource, DEFAULT_PROFILE[resource.resourceType]),
    mappers: [
        {
            filter: "Some filter expression",
            exec: (resource) => applyProfile(resource, 'http://example.com/ExampleResource')
        },
        // other mappers...
    ]
};

export default class YourNewMapper extends AggregateMapper {
    constructor(variables = {}) {
        super(resourceMapping, variables);
    }
}
```

Lastly, add the new mapper to be exported by `src/mapping/mappers/index.js`:

``` JavaScript
const SyntheaToV05 = require('./syntheaToV05');
const YourNewMapper = require('./<your-mapper>.js'); // want to export new mapper to use in project

module.exports = {
    SyntheaToV05,
    YourNewMapper
};
```

Now, the new mapper will be available in the desired project:

``` JavaScript
/* other project's file that needs to do mapping */
import { yourNewMapper } from 'fhir-mapper';
// ...
yourNewMapper.execute(resources) // resources is an array of entries
```

### Linting

Before pushing a new mapper, ensure that there are no eslint errors by running the linter: `yarn test:lint`

### Standalone Usage

To apply mappings to a file standalone, a CLI option is included. 

Usage:
```
> yarn map <mapper> <input> <output>
```
Where:
 - *mapper* - The name of the mapper to use to map the given files. Must be one of the mappers defined in `src/mapping/mappers/index.js`. Ex: `SyntheaToV05`
 - *input* - The path to a single FHIR JSON file or folder containing multiple FHIR JSON files to process.
 - *output* - The location to put the mapped file. If *input* is a folder, *output* should be a folder. Each processed file will have the same name as the unprocessed file in the output folder. *output* may be a single filename if *input* is a single filename.

 All three parameters are required.

 Sample:

 ```
$ yarn map SyntheaToV09 ~/synthea/output/fhir_dstu2/ output
Processing ~/synthea/output/fhir_dstu2/Aaron697_Corwin846_e97aaf5b-609c-4147-bf6f-921f45966f72.json
Wrote output/Aaron697_Corwin846_e97aaf5b-609c-4147-bf6f-921f45966f72.json
Processing ~/synthea/output/fhir_dstu2/Aaron697_Lind531_9a572c87-2074-4263-9be5-281f55ee0e90.json
Wrote output/Aaron697_Lind531_9a572c87-2074-4263-9be5-281f55ee0e90.json
Processing ...
 ```