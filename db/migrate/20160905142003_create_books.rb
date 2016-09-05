class CreateBooks < ActiveRecord::Migration[5.0]
  def change
    create_table :books do |t|
      t.string :title
      t.string :description
      t.string :source_language
      t.string :target_language
      t.integer :user_id

      t.timestamps
    end
  end
end
