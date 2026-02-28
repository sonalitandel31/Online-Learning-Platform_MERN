const computeEndDate = ({ startDate = new Date(), billingCycle }) => {
  const end = new Date(startDate);

  if (billingCycle === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    // default monthly
    end.setMonth(end.getMonth() + 1);
  }

  return end;
};

module.exports = { computeEndDate };