"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRegistration = void 0;
const handleRegistration = async (req, res) => {
    try {
        // your Story + Yakoa logic here
        return res.status(200).json({ message: 'Registered successfully!' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
};
exports.handleRegistration = handleRegistration;
//# sourceMappingURL=handleRegistration.js.map