/**
 * Universities Configuration
 * Defines available universities, their domains, and faculties/colleges
 */

const Universities = Object.freeze({
  "cu.edu.eg": {
    name: "Cairo University",
    subdomains: {
      sca: "Faculty of Arts",
      sci: "Faculty of Science",
      eng: "Faculty of Engineering",
      med: "Faculty of Medicine",
      dentistry: "Faculty of Dentistry",
      pharma: "Faculty of Pharmacy",
      law: "Faculty of Law",
      foc: "Faculty of Commerce",
      edu: "Faculty of Education",
      agr: "Faculty of Agriculture",
      vet: "Faculty of Veterinary Medicine",
      pt: "Faculty of Physical Therapy",
      fci: "Faculty of Computers & AI",
      nursing: "Faculty of Nursing",
      masscomm: "Faculty of Mass Communication",
      feps: "Faculty of Economics & Political Science",
      dar: "Faculty of Dar Al‑Ulum",
      arch: "Faculty of Archaeology",
      rup: "Faculty of Regional & Urban Planning",
    },
  },
});

module.exports = Universities;
