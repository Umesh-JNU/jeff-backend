exports.optGenerator = (length = 4) => {
  const a = Math.pow(10, length - 1);
  return Math.floor(a * (1 + Math.random() * 9));
}

exports.passwordGenerator = (length = 8) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}