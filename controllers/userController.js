const User = require("../models/User");
const { errorCodes, successCodes } = require("../utils/statusCodes");
const { ValidationError, DatabaseError, EntityAlreadyExistsError } = require("../utils/customErrors");
const handleError = require("../utils/CRUDErrorHandler");
const EventEmitter = require("events");
const { EVENTS } = require("../utils/utilConstants");

/*
    @desc       Get all users
    @route      GET /api/user
    @access     Public
*/

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    if (!users) {
      throw new DatabaseError("Users could not be found.");
    }
    if (users.length === 0) {
      res.status(successCodes.NO_CONTENT).json({
        status: "success",
        data: {
          users,
        },
      });
    } else {
      res.status(successCodes.OK).json({
        status: "success",
        data: {
          users,
        },
      });
    }
  } catch (err) {
    res.status(errorCodes.SERVER_ERROR);
    next(err);
  }
};

/*
    @desc    Create a new user
    @route   POST /api/user
    @access  Public
*/

const newUserEmitter = new EventEmitter();

const createNewUser = async (req, res, next) => {
  try{
    const email = req.body.email;
    const NSFWPref = (req.body.NSFWPreference === "true");
    if (!isValidEmail(email)) {
      throw new ValidationError(email);
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new EntityAlreadyExistsError(`User with email ${email} already exists.`);
    }
    const newUser = await User.create({ email, NSFWPreference: NSFWPref });
    if (!newUser) {
      throw new DatabaseError("User could not be created.");
    }
    newUserEmitter.emit(EVENTS.SUCCESS, newUser);
    res.status(successCodes.CREATED)
  } catch(err) {
    res = handleError(err, res);
    newUserEmitter.emit(EVENTS.ERROR, err.message);
    next(err);
  }
};

/*
    @desc    Update a user's NSFW preference
    @route   PUT /api/user
    @access  Public
*/

const updateUserNSFWPreference = async (req, res, next) => {
  try {
    const email = req.body.email;
    const NSFWPref = req.body.NSFWPreference;
    if (!isValidEmail(email)) {
      throw new ValidationError(email);
    }
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { NSFWPreference: NSFWPref },
      { new: true }
    );
    if (!updatedUser) {
      throw new DatabaseError(`User with email ${email} could not be updated.`);
    }
    res.status(successCodes.OK).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    res = handleError(err, res);
    next(err);
  }
};

/*
    @desc    Delete a user
    @route   DELETE /api/user
    @access  Public
*/

const deleteUser = async (req, res, next) => {
  try {
    const email = req.body.email;
    if (!isValidEmail(email)) {
      throw new ValidationError(email);
    }
    const deleteRes = await User.deleteOne({ email });
    if (deleteRes.deletedCount === 0) {
      throw new DatabaseError(`User with email ${email} could not be deleted.`);
    }
    res.status(successCodes.OK).json({
      status: "success",
      message: `User with email ${email} deleted.`,
    });
  } catch (err) {
    res = handleError(err, res);
    next(err);
  }
};

/*
    @desc    Get a user by email
    @route   GET /api/user
    @access  Public
*/

const getUserByEmail = async (req, res, next) => {
  try {
    const email = req.params.email;
    if (!isValidEmail(email)) {
      throw new ValidationError(email);
    }
    const user = await User.findOne({ email });
    if (!user) {
      res.status(successCodes.NO_CONTENT).json({
        status: "success",
        message: `User with email ${email} could not be found.`,
      });
    } else {
      res.status(successCodes.OK).json({
        status: "success",
        data: {
          user,
        },
      });
    }
  } catch (err) {
    res = handleError(err, res);
    next(err);
  }
};

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = {
  getAllUsers,
  newUserEmitter,
  createNewUser,
  updateUserNSFWPreference,
  deleteUser,
  getUserByEmail,
};
