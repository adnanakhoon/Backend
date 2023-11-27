import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend through postman
  // validation empty fields
  //check id user already exists through email ,username
  // check for images especially on avatar
  // upload them to cloudinary , avatar
  // create user object - create entry in db
  // remove password and refreshtoken fields from response
  // check for user creation(object)
  // return response

  const { fullName, email, userName, password } = req.body;
  
//   console.log("email", email);

  //  if(fullName === ""){
  //     throw new ApiError(400,"fullname is required")
  //  }

  if (
    [fullName, email, password, userName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUsername = await User.findOne({
    $or: [{ userName }],
  });
  const existedEmail = await User.findOne({
    $or: [{ email }],
  });
  if (existedUsername) {
    throw new ApiError(409, "User with  username already exists ");
  } else if (existedEmail) {
    throw new ApiError(409, "User with email  already exists ");
  }

  // console.log(req.files)

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }

  const user = await User.create({
    userName: userName.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    fullName,
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
})

export { registerUser };
