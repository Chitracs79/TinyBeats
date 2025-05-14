const express = require('express');
const dotenv = require('dotenv').config();
const path = require('path');
const nocache = require("nocache")
const session = require("express-session");
const passport = require("./config/passport");
const flash = require("connect-flash");
const globalCounts = require('./middlewares/globalCounts');
const multer = require('multer');
const middleware = require('./middlewares/middleware');
const usersRouter = require('./routes/usersRoute');
const adminRouter = require('./routes/adminRoute');
const connectDB = require('./config/connectDB');
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
app.use(flash());
app.use(middleware.flashMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(globalCounts);

app.use(express.static(path.join(__dirname, 'public')));
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','ejs');

//connecting with database
connectDB();

//setting routes
app.use('/',usersRouter)
app.use('/admin',adminRouter);

//Error Handler
app.use((err, req, res, next) => {
    console.error("Error caught:", err);

    if (err instanceof multer.MulterError) {
     
        return res.status(400).json({ success: false, message: err.message });
    } else if (err && err.message === "Only image files are allowed!") {
      
        return res.status(400).json({ success: false, message: err.message });
    }

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