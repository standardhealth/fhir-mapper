# FHIR Mapper

Library for mapping various forms of FHIR to mCODE by adding mCODE profiles onto the incoming FHIR. 

## Current Mappers
* Synthea FHIR => mCODE v0.5 (`src/mappers/syntheaToV05.js`)

## Quickstart

Install into your project via yarn:

``` bash
$ yarn add fhir-mapper
```

In the file where the mapping needs to be done, import one of the supported mappers (e.g. Synthea) directly into the project. Here is an example of utilizing the Synthea mapper to add mCODE v0.5 profiles onto Synthea FHIR:

``` JavaScript
import { syntheaToV05 } from 'fhir-mapper';

const json = {/* obtained Synthea FHIR json */};
const entries = [];

const resources = json.entry.map(e => e.resource);
const results = syntheaToV05.execute(resources);
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

const { buildMappers } = require('../mapper');

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

module.exports = buildMappers(resourceMapping);
```

Lastly, add the new mapper to be exported by `src/mapping/mappers/index.js`:

``` JavaScript
const syntheaToV05 = require('./syntheaToV05');
const yourNewMapper = require('./<your-mapper>.js'); // want to export new mapper to use in project

module.exports = {
    syntheaToV05,
    yourNewMapper
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
