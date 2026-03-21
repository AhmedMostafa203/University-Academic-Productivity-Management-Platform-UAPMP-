// utils/excelExport.js
// Utility for exporting attendance records to Excel using exceljs

const ExcelJS = require("exceljs");

/**
 * Generate an Excel file buffer for attendance records.
 * @param {Array} attendanceList - Array of attendance objects {studentName, studentId, timestamp}
 * @returns {Promise<Buffer>} Excel file buffer
 */
async function generateAttendanceExcel(attendanceList) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Attendance");

  // Define columns
  worksheet.columns = [
    { header: "Name", key: "studentName", width: 30 },
    { header: "Student ID", key: "studentId", width: 20 },
    { header: "Time", key: "timestamp", width: 15 },
  ];

  // Add rows with formatted time (HH:mm)
  attendanceList.forEach((record) => {
    let timeStr = "";
    if (record.timestamp) {
      const d = new Date(record.timestamp);
      const hours = d.getHours().toString().padStart(2, "0");
      const mins = d.getMinutes().toString().padStart(2, "0");
      timeStr = `${hours}:${mins}`;
    }
    worksheet.addRow({
      studentName: record.studentName,
      studentId: record.studentId,
      timestamp: timeStr,
    });
  });

  // Generate buffer
  return workbook.xlsx.writeBuffer();
}

module.exports = { generateAttendanceExcel };
