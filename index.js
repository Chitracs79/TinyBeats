const express = require('express');
const dotenv = require('dotenv').config();
const path = require('path');
const nocache = require("nocache")
const session = require("express-session");
const passport = require("./config/passport");
const usersRouter = require('./routes/usersRoute');
const adminRouter = require('./routes/adminRoute');
const connectDB = require('./config/connectDB')
// const {syncUser} = require("./middlewares/auth");
const { error } = require('console');

const app = express();

//use middleware
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(nocache());
app.use(session({
    secret:process.env.SESSION_SECRET ,
    resave :false,
    saveUninitialized: true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize());
app.use(passport.session());
// app.use(syncUser);

app.use(express.static(path.join(__dirname, 'public')));
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','ejs');

//connecting with database
connectDB();

//setting routes
app.use('/',usersRouter)
app.use('/admin',adminRouter);



//error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack); 

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

//start server
const port  = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log(`Server running on http:\\localhost:${port}`);
})