function Quote() {
  const quotesData = [
    {
      quote: "Be yourself; everyone else is already taken.",
      author: "Oscar Wilde",
    },
    {
      quote: "If you tell the truth, you don't have to remember anything.",
      author: "Mark Twain",
    },
    {
      quote:
        "Everybody is a genius. But if you judge a fish by its ability to climb a tree, it will live its whole life believing that it is stupid",
      author: "Albert Einstein",
    },
    {
      quote:
        "Try not to become a man of success, but rather try to become a man of value",
      author: "Albert Einstein",
    },
    {
      quote:
        "Education is not the learning of facts, it’s rather the training of the mind to think",
      author: "Albert Einstein",
    },
    {
      quote:
        "Surround yourself with people that challenge how you think not people that nod their head and act like they agree",
      author: "Nathan Feuerstein",
    },
    {
      quote:
        "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
      author: "Dr Ralph Waldo Emerson",
    },
  ];

  const randomIntInRange = (max) => {
    return Math.floor(Math.random() * Math.floor(quotesData.length));
  };

  const rand = randomIntInRange(quotesData.length);

  return (
    <>
      <br />
      <h4
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        "{quotesData[rand].quote}"
      </h4>
      <h4
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        -{quotesData[rand].author}
      </h4>
    </>
  );
}

export default Quote;
