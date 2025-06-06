var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

require('dotenv').config()

const options = {
  definition: {
    openapi: '3.0.0', // Specify the OpenAPI version
    info: {
      title: 'Data API Express.js',
      version: '1.0.0',
      description: 'A simple REST API for your data',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Update with your actual deployment URL
        description: 'Development server',
      },
      {
        url: 'https://dataapi-qy43.onrender.com', // Replace with your Render URL
        description: 'Production server',
      },
    ],
  },
  apis: ['./routes/*.js', './models/*.js', 'app.js'], // Paths to files containing OpenAPI comments (e.g., JSDoc style)
  // Or if all your route definitions are in app.js, just './app.js'
};
const swaggerSpec = swaggerJsdoc(options);
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRoutes = require('./routes/auth');
var raceRoutes = require('./routes/race');

var app = express();
app.use(cors()); // Enable CORS for all endpoints
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



// Connect to MongoDB
mongoose.connect(process.env.MONGO_CONNECT)
 .then(() => console.log('Connected to MongoDB'))
 .catch(err => console.error('Could not connect to MongoDB', err));


// Define routes BEFORE error handlers
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRoutes);
app.use('/raceManagement',raceRoutes);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
