import { z } from 'zod';

// Plain-language default messages, so people never see things like "Expected string, received undefined".
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case 'invalid_type':
      return { message: issue.received === 'undefined' ? 'This field is required.' : 'This value is not in the right format.' };
    case 'too_small':
      if (issue.type === 'string') {
        return { message: issue.minimum <= 1 ? 'This field cannot be empty.' : `Please use at least ${issue.minimum} characters.` };
      }
      if (issue.type === 'array') return { message: `Please add at least ${issue.minimum}.` };
      return { message: `This must be at least ${issue.minimum}.` };
    case 'too_big':
      if (issue.type === 'string') return { message: `Please use ${issue.maximum} characters or fewer.` };
      if (issue.type === 'array') return { message: `Please add no more than ${issue.maximum}.` };
      return { message: `This must be at most ${issue.maximum}.` };
    case 'invalid_string':
      if (issue.validation === 'email') return { message: 'Please enter a valid email address.' };
      if (issue.validation === 'uuid') return { message: 'That ID is not valid.' };
      if (issue.validation === 'url') return { message: 'Please enter a valid web address.' };
      break;
    case 'invalid_enum_value':
      return { message: `Please choose one of: ${issue.options.join(', ')}.` };
    case 'unrecognized_keys':
      return { message: `These fields are not allowed: ${issue.keys.join(', ')}.` };
    default:
      break;
  }
  return { message: ctx.defaultError };
});
