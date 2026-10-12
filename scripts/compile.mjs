import solc from 'solc';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

const source = await readFile('contracts/AcikKasa.sol', 'utf8');
const settings = { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi','evm.bytecode.object','metadata'] } } };
const output = JSON.parse(solc.compile(JSON.stringify({ language:'Solidity', sources:{'AcikKasa.sol':{content:source}}, settings })));
for (const error of output.errors || []) console[error.severity === 'error' ? 'error' : 'warn'](error.formattedMessage);
if ((output.errors || []).some(e => e.severity === 'error')) process.exit(1);
const compiled = output.contracts['AcikKasa.sol'].AcikKasa;
await mkdir('artifacts', { recursive:true });
await writeFile('artifacts/AcikKasa.json', JSON.stringify({ abi:compiled.abi, bytecode:'0x'+compiled.evm.bytecode.object, compiler:solc.version(), settings },null,2));
await writeFile('dist/js/contract-artifact.js', '// Generated from contracts/AcikKasa.sol by scripts/compile.mjs.\nexport const ABI = '+JSON.stringify(compiled.abi,null,2)+';\nexport const BYTECODE = '+JSON.stringify('0x'+compiled.evm.bytecode.object)+';\n');
await copyFile('node_modules/ethers/dist/ethers.min.js', 'dist/vendor/ethers-6.17.0.min.js');
await copyFile('node_modules/ethers/LICENSE.md', 'dist/vendor/LICENSE-ethers.md');
console.log(`Compiled AcikKasa with ${solc.version()}; ${compiled.evm.bytecode.object.length / 2} byte deployment bytecode. Vendored ethers.js 6.17.0.`);
