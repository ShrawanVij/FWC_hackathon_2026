import Groq from "groq-sdk";
import User from "../models/User.js";
import Job from "../models/Job.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

// GET /api/hr/onboarding — candidates with plans + eligible (shortlisted/hired, no plan)
export const getHROnboarding = async (req, res) => {
  try {
    // Find all jobs posted by this HR to identify eligible candidates
    const jobs = await Job.find({ postedBy: req.user._id }).select("title company applicants");

    // Map candidateId → job info for shortlisted/hired applicants
    const eligibleMap = {};
    for (const job of jobs) {
      for (const applicant of job.applicants) {
        if (["shortlisted", "hired"].includes(applicant.status)) {
          eligibleMap[applicant.candidate.toString()] = {
            jobTitle:   job.title,
            jobCompany: job.company,
            jobId:      job._id,
            status:     applicant.status,
            aiScore:    applicant.aiScore,
          };
        }
      }
    }
    const eligibleIds = Object.keys(eligibleMap);

    // Candidates who already have onboarding plans
    const withPlans = await User.find({
      role: "candidate",
      onboardingPlan: { $ne: null },
    })
      .select("fullName email skills roleReadinessScore onboardingPlan onboardingJobId onboardingGeneratedAt onboardingDocs")
      .populate("onboardingJobId", "title company")
      .sort({ roleReadinessScore: -1 });

    // Eligible candidates from this HR's jobs who don't have a plan yet
    const withoutPlans = eligibleIds.length > 0
      ? await User.find({
          _id:            { $in: eligibleIds },
          role:           "candidate",
          onboardingPlan: null,
        }).select("fullName email skills roleReadinessScore onboardingDocs")
      : [];

    const eligible = withoutPlans.map((c) => {
      const info = eligibleMap[c._id.toString()] || {};
      return { ...c.toObject(), jobTitle: info.jobTitle, jobCompany: info.jobCompany, jobId: info.jobId, applicantStatus: info.status };
    });

    res.json({ success: true, candidates: withPlans, eligible });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/hr/onboarding/generate/:candidateId — manually generate onboarding plan
export const generateOnboardingPlan = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await User.findById(candidateId);
    if (!candidate || candidate.role !== "candidate")
      return res.status(404).json({ success: false, message: "Candidate not found" });

    // Ensure this candidate applied to one of this HR's jobs with shortlisted/hired status
    const job = await Job.findOne({
      postedBy:                req.user._id,
      "applicants.candidate":  candidateId,
      "applicants.status":     { $in: ["shortlisted", "hired"] },
    });
    if (!job)
      return res.status(403).json({ success: false, message: "Candidate is not shortlisted or hired for any of your jobs" });

    const applicant = job.applicants.find((a) => a.candidate.toString() === candidateId);
    const aiScore   = applicant?.aiScore   ?? null;
    const aiSummary = applicant?.aiSummary ?? null;

    const prompt = `
You are an expert HR onboarding specialist. Generate a personalized onboarding plan for this candidate.

CANDIDATE: ${candidate.fullName || "Candidate"}
SKILLS: ${candidate.skills?.join(", ") || "Not listed"}
RESUME: ${candidate.resumeText ? candidate.resumeText.slice(0, 1500) : "Not provided"}

POSITION: ${job.title}
COMPANY: ${job.company || "The company"}
REQUIRED SKILLS: ${job.skills?.join(", ") || "Not specified"}
REQUIREMENTS: ${job.requirements?.join(", ") || "Not specified"}
JOB DESCRIPTION: ${job.description}

AI RANKING SCORE: ${aiScore ?? "Not ranked"}
RANKING SUMMARY: ${aiSummary ?? "N/A"}
STATUS: ${applicant?.status?.toUpperCase() || "SHORTLISTED"}

Compute roleReadiness (0-100) based on skills fit, ranking score, and job requirements.

Return ONLY valid JSON (no markdown):
{
  "roleReadiness": <0-100>,
  "welcomeMessage": "<2-sentence personalized welcome referencing their specific role>",
  "day1Checklist": ["item1", "item2", "item3", "item4", "item5"],
  "week1Goals": ["goal1", "goal2", "goal3"],
  "day30Goals": ["goal1", "goal2", "goal3"],
  "day60Goals": ["goal1", "goal2", "goal3"],
  "day90Goals": ["goal1", "goal2", "goal3"],
  "skillsToLearn": [
    { "skill": "<skill name>", "resource": "<url or resource name>", "priority": "<high|medium|low>" }
  ],
  "strengths": ["strength1", "strength2"],
  "areasToGrow": ["area1", "area2"],
  "teamIntegrationTips": ["tip1", "tip2", "tip3"]
}`;

    const completion = await groq.chat.completions.create({
      model:    "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = completion.choices[0].message.content.replace(/```json|```/g, "").trim();
    const plan = JSON.parse(text);

    plan.onboardingMeta = {
      rankingScore:  aiScore,
      recommendation: applicant?.status || "shortlisted",
    };

    await User.findByIdAndUpdate(candidateId, {
      onboardingPlan:        plan,
      onboardingJobId:       job._id,
      onboardingGeneratedAt: new Date(),
      roleReadinessScore:    plan.roleReadiness,
    });

    res.json({ success: true, message: "Onboarding plan generated successfully" });
  } catch (err) {
    console.error("Generate onboarding error:", err);
    res.status(500).json({ success: false, message: "Failed to generate plan: " + err.message });
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
      plan:               user.onboardingPlan,
      jobTitle:           user.onboardingJobId?.title   || null,
      jobCompany:         user.onboardingJobId?.company || null,
      generatedAt:        user.onboardingGeneratedAt,
      roleReadinessScore: user.roleReadinessScore,
      docs:               user.onboardingDocs || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
