import Joi from 'joi';

export const customerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional(),
  total_spend: Joi.number().min(0).default(0),
  visits: Joi.number().min(0).default(0),
  last_order_at: Joi.date().optional(),
  last_active_at: Joi.date().optional()
});

export const orderSchema = Joi.object({
  customerId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().default('INR')
});
