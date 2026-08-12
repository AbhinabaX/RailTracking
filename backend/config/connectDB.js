import mongoose from "mongoose";


const connectDB = async () => {

  try {

    const mongoURI =
      process.env.MONGO_URI;


    if (!mongoURI) {

      throw new Error(
        "MONGO_URI is missing from .env"
      );

    }


    console.log(
      "[BACKEND] Connecting to MongoDB..."
    );


    await mongoose.connect(
      mongoURI
    );


    console.log(
      "[BACKEND] MongoDB connected successfully."
    );

  } catch (error) {

    console.error(
      "[BACKEND] MongoDB connection error:",
      error.message
    );


    process.exit(1);

  }

};


export default connectDB;