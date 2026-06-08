import Groq from "groq-sdk";
import Job from "../models/Job.js";
import User from "../models/User.js";
import Interview from "../models/Interview.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateContent = async (prompt) => {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  return response.choices[0].message.content;
};

// POST /api/ai/rank-candidates/:jobId — HR: rank all applicants for a job
export const rankCandidates = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate("applicants.candidate", "fullName email phone skills resumeUrl resumeText");

    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.postedBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your job" });
    if (job.applicants.length === 0)
      return res.status(400).json({ success: false, message: "No applicants yet" });

    const { topN } = req.body;
    const limit = topN && Number.isInteger(topN) && topN > 0 ? topN : null;

    const candidateList = job.applicants
      .filter((a) => a.candidate)
      .slice(0, limit || undefined)
      .map((a, i) => ({
        index: i,
        name: a.candidate.fullName || a.candidate.email,
        email: a.candidate.email,
        phone: a.candidate.phone || null,
        skills: a.candidate.skills?.join(", ") || "Not specified",
        resumeText: a.candidate.resumeText || null,
        resumeUrl: a.candidate.resumeUrl || null,
        id: a.candidate._id.toString(),
      }));

    const prompt = `
You are a senior technical recruiter AI. Analyze these candidates for the job below and score them on 14 factors.

JOB TITLE: ${job.title}
JOB DESCRIPTION: ${job.description}
REQUIRED SKILLS: ${job.skills.join(", ")}
REQUIREMENTS: ${job.requirements.join(", ")}

CANDIDATES:
${candidateList.map((c) => `${c.index + 1}. Name: ${c.name}
   Skills: ${c.skills}
   Resume: ${c.resumeText ? c.resumeText.slice(0, 3000) : "Not provided — evaluate on skills only"}`).join("\n\n")}

Score each candidate on ALL 14 factors (0-100 each). The overall score is the weighted average.

FACTORS:
1. skillMatch — how well their skills match the job requirements
2. relevantExperience — years and relevance of work experience
3. educationQualification — degree level and field relevance
4. certifications — relevant certifications and credentials
5. industryExperience — experience in the same or related industry
6. projectExperience — relevant projects in their portfolio/resume
7. technicalCompetency — depth of technical knowledge
8. domainKnowledge — understanding of the job domain
9. roleRelevance — how closely past roles match this position
10. achievementsImpact — measurable achievements and impact
11. careerStability — job tenure and career progression consistency
12. communicationResumeQuality — clarity and quality of resume/communication
13. leadershipExperience — leadership or team management experience
14. learningAgility — evidence of picking up new skills quickly

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "id": "<candidate_id>",
    "name": "<name>",
    "score": <0-100 weighted overall>,
    "summary": "<2 sentence overall assessment>",
    "strengths": ["strength1", "strength2"],
    "gaps": ["gap1", "gap2"],
    "factors": {
      "skillMatch": <0-100>,
      "relevantExperience": <0-100>,
      "educationQualification": <0-100>,
      "certifications": <0-100>,
      "industryExperience": <0-100>,
      "projectExperience": <0-100>,
      "technicalCompetency": <0-100>,
      "domainKnowledge": <0-100>,
      "roleRelevance": <0-100>,
      "achievementsImpact": <0-100>,
      "careerStability": <0-100>,
      "communicationResumeQuality": <0-100>,
      "leadershipExperience": <0-100>,
      "learningAgility": <0-100>
    }
  }
]

Use the index order to map back to ids: ${candidateList.map((c) => `index ${c.index} = id ${c.id}`).join(", ")}
Sort by score descending.
`;

    const text = (await generateContent(prompt)).replace(/```json|```/g, "").trim();
    const rankings = JSON.parse(text);

    // Merge candidate contact details into rankings
    const enriched = rankings.map((rank) => {
      const meta = candidateList.find((c) => c.id === rank.id);
      return { ...rank, email: meta?.email || "", phone: meta?.phone || "", skills: meta?.skills || "", resumeUrl: meta?.resumeUrl || "" };
    });

    // Save AI scores back to job applicants
    for (const rank of enriched) {
      const applicant = job.applicants.find(
        (a) => a.candidate._id.toString() === rank.id
      );
      if (applicant) {
        applicant.aiScore = rank.score;
        applicant.aiSummary = rank.summary;
        if (rank.score >= 70) applicant.status = "shortlisted";
      }
    }
    await job.save();

    res.json({ success: true, rankings: enriched });
  } catch (err) {
    console.error("Gemini rank error:", err);
    res.status(500).json({ success: false, message: "AI ranking failed: " + err.message });
  }
};

// POST /api/ai/mock-interview/start — Candidate: generate interview questions
export const startMockInterview = async (req, res) => {
  try {
    const { jobTitle, skills, jobDescription } = req.body;
    if (!jobTitle) return res.status(400).json({ success: false, message: "jobTitle is required" });

    const prompt = `
You are a technical interviewer. Generate 5 interview questions for this role.

Role: ${jobTitle}
Skills: ${skills || "General software engineering"}
${jobDescription ? `Description: ${jobDescription}` : ""}

Return ONLY a valid JSON array of 5 strings (no markdown, no numbering):
["question1", "question2", "question3", "question4", "question5"]

Mix: 2 technical, 1 problem-solving, 1 behavioral, 1 situational.
`;

    const text = (await generateContent(prompt)).replace(/```json|```/g, "").trim();
    const questions = JSON.parse(text);

    res.json({ success: true, questions });
  } catch (err) {
    console.error("Mock interview start error:", err);
    res.status(500).json({ success: false, message: "Failed to generate questions: " + err.message });
  }
};

// POST /api/ai/mock-interview/evaluate — Candidate: evaluate answers
export const evaluateMockInterview = async (req, res) => {
  try {
    const { jobTitle, questions, answers } = req.body;
    if (!questions?.length || !answers?.length)
      return res.status(400).json({ success: false, message: "Questions and answers required" });

    const qa = questions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || "No answer"}`).join("\n\n");

    const prompt = `
You are a senior technical interviewer evaluating a mock interview.

Role: ${jobTitle}
Interview Q&A:
${qa}

Return ONLY a valid JSON object (no markdown):
{
  "overallScore": <0-100>,
  "grade": "<A/B/C/D/F>",
  "summary": "<3-4 sentence overall assessment>",
  "feedback": [
    { "question": "q1 short", "score": <0-20>, "feedback": "feedback text" },
    ...5 items
  ],
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "recommendation": "<hire/consider/pass>"
}
`;

    const text = (await generateContent(prompt)).replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(text);

    res.json({ success: true, evaluation });
  } catch (err) {
    console.error("Mock interview eval error:", err);
    res.status(500).json({ success: false, message: "Evaluation failed: " + err.message });
  }
};

// POST /api/ai/profile-review — Candidate: AI reviews their profile
export const reviewProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const prompt = `
Review this candidate's profile and give actionable advice.

Name: ${user.fullName || "Not set"}
Skills: ${user.skills?.join(", ") || "None listed"}
Resume: ${user.resumeText ? user.resumeText.slice(0, 3000) : "Not provided — assess based on skills only"}

Return ONLY valid JSON (no markdown):
{
  "profileScore": <0-100>,
  "summary": "<2 sentence summary>",
  "tips": ["tip1", "tip2", "tip3", "tip4"],
  "missingSkills": ["skill1", "skill2"],
  "profileStrength": "<weak/moderate/strong>"
}
`;

    const text = (await generateContent(prompt)).replace(/```json|```/g, "").trim();
    const review = JSON.parse(text);

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: "Profile review failed: " + err.message });
  }
};

// POST /api/ai/interview-questions/:id — candidate: generate questions for a scheduled interview
export const generateInterviewQuestions = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate("job", "title skills description");

    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    if (interview.candidate.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your interview" });

    // Return existing questions without calling Gemini again
    if (interview.mockQuestions.length > 0)
      return res.json({ success: true, questions: interview.mockQuestions });

    const prompt = `
You are a technical interviewer. Generate 5 interview questions for this role.

Role: ${interview.job.title}
Required Skills: ${interview.job.skills?.join(", ") || "General skills"}
Description: ${interview.job.description}

Return ONLY a valid JSON array of 5 strings (no markdown, no numbering):
["question1", "question2", "question3", "question4", "question5"]

Mix: 2 technical, 1 problem-solving, 1 behavioral, 1 situational.
`;

    const text = (await generateContent(prompt)).replace(/```json|```/g, "").trim();
    const questions = JSON.parse(text);

    interview.mockQuestions = questions;
    await interview.save();

    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to generate questions: " + err.message });
  }
};

// POST /api/ai/evaluate-interview/:id — HR: AI evaluate a completed interview
export const evaluateInterview = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate("candidate", "fullName email resumeText skills")
      .populate("job", "title company description skills requirements");

    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    if (interview.scheduledBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not your interview" });

    const { candidate, job } = interview;

    const hasAnswers = interview.mockAnswers.length > 0;
    const qa = hasAnswers
      ? interview.mockQuestions.map((q, i) =>
          `Q${i + 1}: ${q}\nA${i + 1}: ${interview.mockAnswers[i] || "No answer"}`
        ).join("\n\n")
      : null;

    const prompt = `
You are a senior technical interviewer evaluating a real job interview.

POSITION: ${job.title}
REQUIRED SKILLS: ${job.skills?.join(", ") || "Not specified"}
REQUIREMENTS: ${job.requirements?.join(", ") || "Not specified"}
JOB DESCRIPTION: ${job.description}

CANDIDATE RESUME:
${candidate.resumeText ? candidate.resumeText.slice(0, 2000) : "Not provided — evaluate based on interview answers only"}

INTERVIEW Q&A:
${hasAnswers ? qa : "Candidate did not submit written answers — evaluate based on resume and job fit only"}

Return ONLY valid JSON (no markdown):
{
  "overallScore": <0-100>,
  "technicalScore": <0-100>,
  "communicationScore": <0-100>,
  "confidenceScore": <0-100>,
  "recommendation": "<hire/consider/pass>",
  "summary": "<3-4 sentence overall assessment>",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}
`;

    const text = (await generateContent(prompt)).replace(/```json|```/g, "").trim();
    const evaluation = JSON.parse(text);

    interview.mockScore          = evaluation.overallScore;
    interview.mockFeedback       = evaluation.summary;
    interview.technicalScore     = evaluation.technicalScore;
    interview.communicationScore = evaluation.communicationScore;
    interview.confidenceScore    = evaluation.confidenceScore;
    interview.recommendation     = evaluation.recommendation;
    await interview.save();

    // Set applicant status to "hired" in Job when AI recommends hire
    if (evaluation.recommendation === "hire") {
      await Job.updateOne(
        { _id: interview.job._id, "applicants.candidate": interview.candidate._id },
        { $set: { "applicants.$.status": "hired" } }
      );
    }

    // Auto-generate onboarding plan for hire or consider recommendations
    let onboardingGenerated = false;
    if (["hire", "consider"].includes(evaluation.recommendation)) {
      try {
        // Fetch ranking signal from Job applicants array
        const jobDoc = await Job.findOne(
          { _id: interview.job._id, "applicants.candidate": interview.candidate._id },
          { "applicants.$": 1 }
        );
        const aiScore   = jobDoc?.applicants?.[0]?.aiScore   ?? null;
        const aiSummary = jobDoc?.applicants?.[0]?.aiSummary ?? null;

        const onboardingPrompt = `
You are an expert HR onboarding specialist. A candidate has been selected for a role.
Using the provided evaluation signals, generate a personalized onboarding plan and compute their Role Readiness Score.

CANDIDATE: ${candidate.fullName || "Candidate"}
SKILLS: ${candidate.skills?.join(", ") || "Not listed"}
RESUME: ${candidate.resumeText ? candidate.resumeText.slice(0, 1500) : "Not provided"}

POSITION: ${job.title}
COMPANY: ${job.company || "The company"}
REQUIRED SKILLS: ${job.skills?.join(", ") || "Not specified"}
REQUIREMENTS: ${job.requirements?.join(", ") || "Not specified"}
JOB DESCRIPTION: ${job.description}

AI RANKING (candidate score vs all other applicants):
  Peer Score: ${aiScore ?? "Not ranked"}
  Ranking Summary: ${aiSummary ?? "N/A"}

INTERVIEW EVALUATION (already completed — use these scores directly, do not recompute):
  Overall Score:       ${evaluation.overallScore}/100
  Technical Score:     ${evaluation.technicalScore}/100
  Communication Score: ${evaluation.communicationScore}/100
  Confidence Score:    ${evaluation.confidenceScore}/100
  Evaluator Notes:     ${evaluation.summary}
  Recommendation:      ${evaluation.recommendation.toUpperCase()}

Compute roleReadiness (0-100) by synthesizing resume-to-job skills fit, ranking score vs peers, and interview scores.

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
}
`;

        const onboardingText = (await generateContent(onboardingPrompt)).replace(/```json|```/g, "").trim();
        const plan             = JSON.parse(onboardingText);

        // Attach explainability metadata — built from known signals, not from Gemini
        plan.onboardingMeta = {
          rankingScore:      aiScore,
          interviewScore:    evaluation.overallScore,
          technicalScore:    evaluation.technicalScore,
          communicationScore: evaluation.communicationScore,
          confidenceScore:   evaluation.confidenceScore,
          recommendation:    evaluation.recommendation,
        };

        await User.findByIdAndUpdate(interview.candidate._id, {
          onboardingPlan:        plan,
          onboardingJobId:       interview.job._id,
          onboardingGeneratedAt: new Date(),
          roleReadinessScore:    plan.roleReadiness,
        });

        onboardingGenerated = true;
      } catch (onboardingErr) {
        console.error("Onboarding generation error (non-fatal):", onboardingErr.message);
      }
    }

    res.json({ success: true, evaluation, onboardingGenerated });
  } catch (err) {
    console.error("Interview evaluation error:", err);
    res.status(500).json({ success: false, message: "Evaluation failed: " + err.message });
  }
};