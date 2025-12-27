
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
}

// Minimal Schema Definitions for Verification
const LoginEventSchema = new mongoose.Schema({
    name: String,
    email: String,
    timestamp: Date,
});

const LoginEvent = mongoose.model("LoginEvent", LoginEventSchema);

async function verify() {
    try {
        await mongoose.connect(MONGO_URI as string);
        console.log("✅ Connected to MongoDB");

        console.log("\n🔍 Checking last 10 Login Events...");
        const events = await LoginEvent.find().sort({ timestamp: -1 }).limit(10).lean();

        if (events.length === 0) {
            console.log("⚠️ No login events found.");
        } else {
            console.table(
                events.map((e: any) => ({
                    Name: e.name,
                    Email: e.email,
                    Time: e.timestamp?.toISOString(),
                    "Is Valid?": isValidName(e.name) ? "✅" : "❌",
                }))
            );
        }

        console.log("\n---------------------------------------------------");
        console.log("Validation Rules:");
        console.log("1. Name must NOT be a Firebase UID (28 chars, alphanumeric)");
        console.log("2. Name must NOT be numeric or random string");
        console.log("3. Expecting actual Arabic names or 'username' or 'مستخدم'");
        console.log("---------------------------------------------------\n");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

function isValidName(name: string) {
    if (!name) return false;
    // Check for Firebase UID pattern (approximate)
    if (name.length === 28 && /^[a-zA-Z0-9]+$/.test(name)) return false;
    return true;
}

verify();
