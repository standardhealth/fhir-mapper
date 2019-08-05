const fs = require('fs');
const program = require('commander');
const path = require('path');
const mappings = require('.');

let input, output, mapper;

program
    .usage('<selected-mapping> <path-to-patient-json> <output-destination>')
    .arguments('<selected-mapping> <path-to-patient-json> <output-destination>')
    .action((selectedMapping, pathToPatientJson, outputDestination) => {
        mapper = selectedMapping;
        input = pathToPatientJson;
        output = outputDestination;
    })
    .parse(process.argv);

if (!mappings[mapper]) {
    throw new Error(`Unknown mapper name: ${mapper}`);
}

mapper = mappings[mapper];

if (!fs.existsSync(input)) {
    throw new Error(`Input file does not exist: ${input}`);
}

const processFile = (file, outfile) => {
    const fileContent = fs.readFileSync(file, 'utf8');
    const patient = JSON.parse(fileContent);

    const processedPatient = mapper.execute(patient);
    const processedPatientJson = JSON.stringify(processedPatient, null, 2);


    if (fs.existsSync(outfile) && fs.lstatSync(outfile).isDirectory()) {
        // create a file with the same name in the output directory
        outfile = path.join(outfile, path.basename(file));
    } else {
        // ensure that the path is absolute
        outfile = path.resolve(outfile);
    }

    fs.writeFileSync(outfile, processedPatientJson, 'utf8');
    console.log(`Wrote ${outfile}`);
};

if (fs.lstatSync(input).isDirectory()) {
  const files = fs.readdirSync(input);

  for (const filename of files) {
      const file = path.join(input, filename);
      console.log(`Processing ${file}`);
      processFile(file, output);
  }
} else {
    // single file
    processFile(input, output);
}