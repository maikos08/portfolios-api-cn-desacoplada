import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', corsOptions.origin as string);
    res.setHeader('Access-Control-Allow-Headers', (corsOptions.allowedHeaders as string[]).join(','));
    res.setHeader('Access-Control-Allow-Methods', (corsOptions.methods as string[]).join(','));
    return res.sendStatus((corsOptions.optionsSuccessStatus as number) || 204);
  }
  next();
});

app.use(express.json());
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, '..', 'public')));

export default app;
