const mongoose = require('mongoose');

const ShoeSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please Enter Product Name"],
        },
        price: {
            type: Number,
            required: true,
            default: 0
        },
        photos: [{
            public_id: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        }],
        category: {
            type: String,
            required: true,
        },
        sizes: {
            type: [String],
            required: true,
        },
        description: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
);

const Product = mongoose.model("Product", ShoeSchema);
module.exports = Product;
