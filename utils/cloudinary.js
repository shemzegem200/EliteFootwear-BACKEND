const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name:'dbob1dcko',
    api_key:'216654868498558',
    api_secret:'b3XKvP7zCpxooqjJEcKH3mHiHAE'
});

module.exports = cloudinary;