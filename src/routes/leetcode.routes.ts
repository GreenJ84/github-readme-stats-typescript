import express from "express";

export const GithubRoutes = (app: express.Application) => {
    // Stars, contribution points, reputaion, rating
    app.get('/leetcode/stats')
    // Display th earned leetcode badges
    app.get('/leetcode/badges')
    // Questions solved total and by level
    app.get('/leetcode/questions_solved')
    // Display top 5 most recent questions solved and their languages
    app.get('/leetcode/recent-questions')
    // Get a random leetcode problem title
    app.get('/leetcode/random-question')
}