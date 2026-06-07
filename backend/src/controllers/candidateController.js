import User from "../models/User.js";

// PUT /api/candidate/profile — update profile + skills
export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, skills, resumeUrl, resumeText } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (fullName   !== undefined)  user.fullName   = fullName;
    if (phone      !== undefined)  user.phone      = phone;
    if (skills)                    user.skills     = Array.isArray(skills) ? skills : skills.split(",").map((s) => s.trim());
    if (resumeUrl  !== undefined)  user.resumeUrl  = resumeUrl;
    if (resumeText !== undefined)  user.resumeText = resumeText;

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: "Profile updated", user: user.profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/candidate/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: user.profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/candidate/onboarding/docs — submit a document link
export const submitOnboardingDoc = async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ success: false, message: "name and url required" });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { onboardingDocs: { name, url, submittedAt: new Date() } } },
      { new: true }
    );
    res.json({ success: true, docs: user.onboardingDocs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/candidate/onboarding/docs/:docId — remove a document
export const deleteOnboardingDoc = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { onboardingDocs: { _id: req.params.docId } } },
      { new: true }
    );
    res.json({ success: true, docs: user.onboardingDocs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/hr/onboarding — fetch all candidates with onboarding plans
export const getHROnboarding = async (req, res) => {
  try {
    const candidates = await User.find({
      role: "candidate",
      onboardingPlan: { $ne: null },
    })
      .select("fullName email skills roleReadinessScore onboardingPlan onboardingJobId onboardingGeneratedAt onboardingDocs")
      .populate("onboardingJobId", "title company")
      .sort({ roleReadinessScore: -1 });

    res.json({ success: true, candidates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/candidate/onboarding — fetch generated onboarding plan
export const getOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("onboardingJobId", "title company");

    if (!user.onboardingPlan)
      return res.json({ success: true, plan: null, docs: user.onboardingDocs || [] });

    res.json({
      success: true,
      plan:              user.onboardingPlan,
      jobTitle:          user.onboardingJobId?.title          || null,
      jobCompany:        user.onboardingJobId?.company        || null,
      generatedAt:       user.onboardingGeneratedAt,
      roleReadinessScore: user.roleReadinessScore,
      docs:              user.onboardingDocs || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};