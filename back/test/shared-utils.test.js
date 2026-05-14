const test = require('node:test');
const assert = require('node:assert/strict');

const dateTime = require('../shared/dateTime.cjs');
const plateValidator = require('../shared/licensePlateValidator.cjs');

test('parses and formats mysql datetimes consistently', () => {
  const parsed = dateTime.parseMySqlDateTime('2026-05-14 09:35:20');

  assert.ok(parsed instanceof Date);
  assert.equal(dateTime.toLocalInputDateTime(parsed), '2026-05-14T09:35');
  assert.equal(dateTime.formatMySqlDateTime(parsed), '2026-05-14 09:35:20');
});

test('validates and normalizes spanish plates', () => {
  assert.equal(plateValidator.normalizePlate(' 1234-bcb '), '1234BCB');
  assert.deepEqual(plateValidator.validateSpanishPlate('1234BCB'), {
    isValid: true,
    formatted: '1234BCB',
    error: '',
  });
  assert.equal(plateValidator.validateSpanishPlate('1234AAA').isValid, false);
  assert.equal(plateValidator.filterPlateInput('1234-bcb'), '1234BCB');
  assert.equal(plateValidator.formatPlateDisplay('1234bcb'), '1234-BCB');
});
