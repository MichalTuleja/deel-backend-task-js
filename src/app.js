const express = require('express');
const bodyParser = require('body-parser');
const { sequelize, Contract } = require('./model');
const { Op, ExclusionConstraintError } = require("sequelize");
const { getProfile } = require('./middleware/getProfile');
const httpStatus = require('http-status');
const app = express();

/*
 * Middleware
 */
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);


/*
 * Helpers
 */
const typeToIdDict = {
    'client': 'ClientId',
    'contractor': 'ContractorId',
};


/*
 * Controllers
 */

/**
 * @returns contract by id
 */
const getContractById = async (req, res) => {
    const { Contract } = req.app.get('models');
    const { id } = req.params;
    const { id: profile_id, type } = req.profile.dataValues;

    const contracts = await Contract.findOne({
        where: { id, [typeToIdDict[type]]: profile_id },
    });

    if (!contracts) return res.status(httpStatus.NOT_FOUND).end();
    res.json(contracts);
};

const getContracts = async (req, res) => {
    const PAGINATION_LIMIT = 2;

    const page = req.params.page || 0;

    const { Contract } = req.app.get('models');
    const { id: profile_id, type } = req.profile.dataValues;

    const contracts = await Contract.findAndCountAll({
        limit: PAGINATION_LIMIT,
        offset: PAGINATION_LIMIT * page,
        where: { [typeToIdDict[type]]: profile_id },
    });

    if (!contracts) return res.status(httpStatus.NOT_FOUND).end();
    res.json(contracts);
};

const getUnpaidJobs = async (req, res) => {
    const PAGINATION_LIMIT = 2;

    const page = req.params.page || 0;

    const { Job, Contract } = req.app.get('models');
    const { id: profile_id, type } = req.profile.dataValues;

    let jobs;

    jobs = await Job.findAndCountAll({
        limit: PAGINATION_LIMIT,
        offset: PAGINATION_LIMIT * page,
        where: { 
            'paid': { [Op.not]: true } 
        },
        include: [
            { 
                model: Contract, 
                where: {
                    [typeToIdDict[type]]: profile_id,
                    [Op.or]: [
                        { 'status': 'in_progress' },
                        { 'status': 'new' },
                    ],
                },
                required: true,
            },
        ],
    });

    if (!jobs) return res.status(httpStatus.NOT_FOUND).end();
    res.json(jobs);
};

const notImplemented = async (req, res) => {
    return res.status(httpStatus.NOT_IMPLEMENTED).end();
};

/*
 * Routing
 */
app.get('/contracts/:id', getProfile, getContractById);
app.get('/contracts', getProfile, getContracts);
app.get('/jobs/unpaid', getProfile, getUnpaidJobs);
app.post('/jobs/:job_id/pay', getProfile, notImplemented);
app.post('/balances/deposit/:userId', getProfile, notImplemented);
app.post('/admin/best-profession?start=<date>&end=<date>', getProfile, notImplemented);
app.get('/admin/best-clients?start=<date>&end=<date>&limit=<integer>', getProfile, notImplemented);

module.exports = app;
