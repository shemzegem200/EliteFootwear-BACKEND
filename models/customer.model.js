const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const CustomerSchema = mongoose.Schema(
    {
        name: {
            type: String,
        },
        phone:{
            type:Number,
            required: [true, "Please Enter Phone Number"],
            
        },
        email:{
            type:String,
            required: [true, "Please Enter Your Email"],
        },
        password:{
            type:String,
            required: [true, "Please Enter Your Password"],
        },
        favorites: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        cart: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
        selectedSize:[{
            type: [String]
        }],
        quantity:[{
            type: Number,
        }]


    },
    {
        timestamps: true
    }
);
CustomerSchema.pre('save', async function (next) {
    if (this.isModified('password') || this.isNew) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});
const Customer=mongoose.model("Customer",CustomerSchema);
module.exports=Customer;