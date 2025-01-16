const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const todoSchema = new Schema({
    userData : {
        type: Object,
        required: true,
    },
    companyData : {
        type: Object,
        required: true,
    },
    transactionData : {
        type : Array,
        required : true
    },
    userEmail : {
        type : String,
        require : true
    }
},{
    timestamps : true
});

module.exports = mongoose.model("invoice",todoSchema);