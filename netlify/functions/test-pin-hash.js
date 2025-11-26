// Run this with: node test-pin-hash.js
const bcrypt = require('bcryptjs');

// The hash we put in the database
const storedHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Test different PINs
const pinsToTest = ['1234', '0000', '9999', '1111'];

console.log('\n===========================================');
console.log('Testing bcrypt hash validation');
console.log('===========================================\n');

pinsToTest.forEach((pin) => {
  const result = bcrypt.compareSync(pin, storedHash);
  console.log(`PIN: ${pin} - ${result ? '✅ MATCH' : '❌ NO MATCH'}`);
});

console.log('\n===========================================');
console.log('\nGenerating a fresh hash for PIN 1234:');
console.log('===========================================\n');

bcrypt.hash('1234', 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('New Hash:', hash);
  console.log(
    '\nVerifying new hash with 1234:',
    bcrypt.compareSync('1234', hash) ? '✅ WORKS' : '❌ FAILED'
  );

  console.log('\n===========================================');
  console.log('SQL to update database:');
  console.log('===========================================\n');
  console.log(
    `UPDATE employees SET pin_hash = '${hash}', last_pin_change = NOW(), pin_attempts = 0, pin_locked_until = NULL WHERE deleted_at IS NULL;`
  );
  console.log('\n===========================================\n');
});
