import fs from 'fs';

const p = 'd:/agbc/Ag_Pa/js/managers/patient/PatientModalsHTML.js';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('newPatientReimbursementAuto')) {
  const search = "                    </div>\r\n                    </div>\r\n\r\n                    <div id=\"newPatientModalFooter\"";
  const repl = "                    </motion>\r\n                    </motion>\r\n\r\n                    ${this._getReimbursementReceiptBlock('newPatient')}\r\n\r\n                    <motion id=\"newPatientModalFooter\"";
  const replFixed = repl.replace(/<\/?motion>/g, (m) => (m.startsWith('</') ? '</div>' : '<div')).replace(/motion id/g, 'div id');

  if (!s.includes(search)) {
    console.error('marker not found');
    process.exit(1);
  }
  s = s.replace(search, replFixed);
  fs.writeFileSync(p, s);
  console.log('newPatient block inserted');
} else {
  console.log('newPatient already present');
}
